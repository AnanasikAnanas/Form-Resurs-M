<?php
declare(strict_types=1);
namespace FormResurs;

function config(): array
{
    static $value;
    if ($value !== null) return $value;
    $path = getenv('FR_CONFIG_FILE') ?: dirname(__DIR__) . '/config.local.php';
    if (!is_file($path)) $path = dirname(__DIR__) . '/config.example.php';
    $root = isset($_SERVER['DOCUMENT_ROOT']) && $_SERVER['DOCUMENT_ROOT'] !== '' ? (realpath($_SERVER['DOCUMENT_ROOT']) ?: '') : '';
    $canonical = realpath($path);
    if (PHP_SAPI !== 'cli' && $root !== '' && $canonical !== false && str_starts_with($canonical, rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR)) throw new \RuntimeException('CONFIG_PUBLIC');
    $value = require $path;
    if (!is_array($value) || !is_bool($value['production'] ?? null) || !is_bool($value['enabled'] ?? null)) throw new \RuntimeException('CONFIG_INVALID');
    $parts = parse_url($value['origin'] ?? '');
    if (!$parts || empty($parts['host']) || isset($parts['path']) || isset($parts['query']) || isset($parts['fragment']) || isset($parts['user']) || !in_array($parts['scheme'] ?? '', ['http', 'https'], true)) throw new \RuntimeException('ORIGIN_INVALID');
    if ($value['production'] && $value['enabled'] && (($parts['scheme'] ?? '') !== 'https' || !($value['uploads']['scan_required'] ?? false))) throw new \RuntimeException('PRODUCTION_SECURITY_REQUIRED');
    foreach (['max_files' => 10, 'max_file_mb' => 10, 'max_total_mb' => 20] as $key => $max) {
        $v = $value['uploads'][$key] ?? null;
        if (!is_int($v) || $v < 1 || $v > $max) throw new \RuntimeException('UPLOAD_LIMIT_INVALID');
    }
    if (array_diff($value['uploads']['formats'] ?? [], ['jpg', 'png', 'webp', 'pdf']) || empty($value['uploads']['formats'])) throw new \RuntimeException('UPLOAD_FORMAT_INVALID');
    if (!is_int($value['smtp']['max_attempts'] ?? null) || $value['smtp']['max_attempts'] < 1 || $value['smtp']['max_attempts'] > 20) throw new \RuntimeException('RETRY_LIMIT_INVALID');
    return $value;
}

function db(): \PDO
{
    static $pdo;
    if ($pdo) return $pdo;
    $c = config()['db'];
    foreach (['host', 'name', 'user'] as $key) if (!is_string($c[$key] ?? null) || $c[$key] === '' || preg_match('/[;\x00-\x1f]/', $c[$key])) throw new \RuntimeException('DATABASE_NOT_CONFIGURED');
    $pdo = new \PDO('mysql:host=' . $c['host'] . ';port=' . (int)$c['port'] . ';dbname=' . $c['name'] . ';charset=utf8mb4', $c['user'], $c['password'], [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION, \PDO::ATTR_EMULATE_PREPARES => false]);
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}

function uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 15) | 64);
    $b[8] = chr((ord($b[8]) & 63) | 128);
    $h = bin2hex($b);
    return substr($h, 0, 8) . '-' . substr($h, 8, 4) . '-' . substr($h, 12, 4) . '-' . substr($h, 16, 4) . '-' . substr($h, 20);
}

function validUuid(string $value): bool { return preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iD', $value) === 1; }
function json(array $value): string { return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR); }
function utc(?int $time = null): string { return gmdate('Y-m-d H:i:s', $time ?? time()); }
function limits(): array { $c = config()['uploads']; return ['maxFiles' => $c['max_files'], 'maxFileBytes' => $c['max_file_mb'] * 1048576, 'maxTotalBytes' => $c['max_total_mb'] * 1048576, 'formats' => $c['formats']]; }

function legal(): ?array
{
    $c = config()['legal'];
    if (!($c['approved'] ?? false)) return null;
    foreach (['policy_file', 'consent_file', 'policy_version', 'consent_version'] as $key) if (empty($c[$key]) || !is_string($c[$key])) return null;
    $policy = trim(file_get_contents($c['policy_file']));
    $consent = trim(file_get_contents($c['consent_file']));
    if ($policy === '' || $consent === '' || strlen($policy) > 200000 || strlen($consent) > 50000 || !mb_check_encoding($policy . $consent, 'UTF-8')) throw new \RuntimeException('LEGAL_INVALID');
    return ['policy' => $policy, 'consent' => $consent, 'policyVersion' => $c['policy_version'], 'consentVersion' => $c['consent_version'], 'policyHash' => hash('sha256', $policy), 'consentHash' => hash('sha256', $consent)];
}

function settings(bool $checkDatabase = true): array
{
    $c = config();
    $legal = legal();
    $enabled = $c['enabled'] && $legal !== null && strlen($c['secret']) >= 32 && is_int($c['retention_days']) && $c['retention_days'] > 0 && $c['retention_days'] <= 3650;
    if ($enabled && $checkDatabase) {
        db()->query('SELECT `id` FROM `Application` LIMIT 1');
        $packet = (int)db()->query('SELECT @@max_allowed_packet')->fetchColumn();
        if ($packet < limits()['maxFileBytes'] + 131072) throw new \RuntimeException('DATABASE_PACKET_TOO_SMALL');
    }
    return ['ok' => true, 'enabled' => $enabled, 'limits' => limits(), 'documentVersion' => $legal ? $legal['policyHash'] . ':' . $legal['consentHash'] : '', 'legal' => $legal];
}

function respond(array $body, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json($body);
    exit;
}

function endpoint(callable $action): never
{
    try { $action(); }
    catch (AppError $e) { respond(['ok' => false, 'code' => $e->errorCode, 'message' => $e->getMessage()] + ($e->fields ? ['fieldErrors' => $e->fields] : []), $e->status); }
    catch (\Throwable) { $reference = uuid(); error_log(json(['event' => 'API_FAILED', 'reference' => $reference])); respond(['ok' => false, 'code' => 'SERVER_ERROR', 'message' => 'Сервис временно недоступен. Повторите попытку позже.', 'reference' => $reference], 503); }
    respond(['ok' => false, 'message' => 'Неизвестный запрос.'], 404);
}
