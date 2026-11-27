<?php
declare(strict_types=1);
namespace FormResurs;

function checkOrigin(bool $required): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (($required && $origin !== config()['origin']) || ($origin !== '' && $origin !== config()['origin']) || ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') throw new AppError(403, 'ORIGIN', 'Отправляйте обращение со страницы сайта.');
}

function sign(string $value): string
{
    $secret = config()['secret'];
    if (!is_string($secret) || strlen($secret) < 32) throw new \RuntimeException('FORM_SECRET_MISSING');
    return hash_hmac('sha256', $value, $secret);
}

function token(array $legal, string $key, ?int $now = null): string
{
    $payload = rtrim(strtr(base64_encode(json(['key' => $key, 'issuedAt' => $now ?? (int)floor(microtime(true) * 1000), 'policyHash' => $legal['policyHash'], 'consentHash' => $legal['consentHash']])), '+/', '-_'), '=');
    return $payload . '.' . sign($payload);
}

function verifyToken(string $value, string $key, array $legal, ?int $now = null): void
{
    $parts = explode('.', $value);
    if (strlen($value) > 2000 || count($parts) !== 2 || !preg_match('/^[A-Za-z0-9_-]+$/D', $parts[0]) || !preg_match('/^[a-f0-9]{64}$/D', $parts[1]) || !hash_equals(sign($parts[0]), $parts[1])) throw new AppError(400, 'FORM_TOKEN', 'Обновите форму и повторите отправку.');
    try { $data = json_decode(base64_decode(strtr($parts[0], '-_', '+/'), true) ?: '', true, 16, JSON_THROW_ON_ERROR); } catch (\JsonException) { throw new AppError(400, 'FORM_TOKEN', 'Обновите форму и повторите отправку.'); }
    $now ??= (int)floor(microtime(true) * 1000);
    if (!is_array($data) || count($data) !== 4 || !is_int($data['issuedAt'] ?? null) || ($data['key'] ?? '') !== $key || ($data['policyHash'] ?? '') !== $legal['policyHash'] || ($data['consentHash'] ?? '') !== $legal['consentHash'] || $now - $data['issuedAt'] > 1800000 || $now < $data['issuedAt']) throw new AppError(400, 'FORM_EXPIRED', 'Условия формы обновились или время ожидания истекло. Обновите форму.');
    if ($now - $data['issuedAt'] < 2000) throw new AppError(400, 'TOO_FAST', 'Подождите несколько секунд и повторите отправку.');
}

function takeLimit(string $key, int $seconds, int $max): void
{
    $pdo = db();
    $bucket = intdiv(time(), $seconds);
    $key .= ':' . $bucket;
    $pdo->beginTransaction();
    try {
        $q = $pdo->prepare('INSERT INTO `RateLimit` (`key`, `hits`, `expiresAt`) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE `hits` = LEAST(`hits` + 1, 1000000)');
        $q->execute([$key, utc(($bucket + 1) * $seconds)]);
        $q = $pdo->prepare('SELECT `hits` FROM `RateLimit` WHERE `key` = ? FOR UPDATE');
        $q->execute([$key]);
        $hits = (int)$q->fetchColumn();
        $pdo->commit();
    } catch (\Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    if ($hits > $max) throw new AppError(429, 'RATE_LIMIT', 'Слишком много обращений. Попробуйте позже.');
}

function rateLimit(string $kind): void
{
    $c = config()['rate_limit'];
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (in_array($ip, config()['trusted_proxy_ips'], true)) $ip = $_SERVER['HTTP_X_REAL_IP'] ?? '';
    if (!filter_var($ip, FILTER_VALIDATE_IP)) throw new AppError(400, 'CLIENT_ADDRESS', 'Не удалось проверить источник обращения.');
    takeLimit($kind . ':global', 60, (int)$c['global_per_minute'] * ($kind === 'token' ? 4 : 1));
    takeLimit($kind . ':' . sign($ip), (int)$c['window_seconds'], $kind === 'token' ? 30 : (int)$c['max_requests']);
}

function parseMultipart(string $body, string $type): array
{
    if (!preg_match('/^multipart\/form-data;\s*boundary=(?:"([^"\r\n]{1,70})"|([^;\s\r\n]{1,70}))\s*$/iD', $type, $match)) throw new AppError(415, 'CONTENT_TYPE', 'Используйте форму обращения.');
    $boundary = $match[1] !== '' ? $match[1] : $match[2];
    if (!str_starts_with($body, '--' . $boundary . "\r\n")) throw new AppError(400, 'MULTIPART', 'Не удалось прочитать форму.');
    $parts = explode("\r\n--" . $boundary, substr($body, strlen($boundary) + 4));
    if (count($parts) > 32 || !in_array(array_pop($parts), ['--', "--\r\n"], true)) throw new AppError(400, 'MULTIPART', 'Не удалось прочитать форму.');
    $fields = []; $files = [];
    foreach ($parts as $index => $part) {
        if ($index !== 0) { if (!str_starts_with($part, "\r\n")) throw new AppError(400, 'MULTIPART', 'Не удалось прочитать форму.'); $part = substr($part, 2); }
        $split = strpos($part, "\r\n\r\n");
        if ($split === false || $split > 8192) throw new AppError(400, 'MULTIPART', 'Не удалось прочитать форму.');
        $headers = str_replace("\r\n", "\n", substr($part, 0, $split)); $content = substr($part, $split + 4);
        if (!preg_match('/^Content-Disposition: form-data;\s*name="([^"\r\n]+)"(?:;\s*filename="([^"\r\n]*)")?$/im', $headers, $disposition)) throw new AppError(400, 'MULTIPART', 'Не удалось прочитать форму.');
        $name = $disposition[1];
        if (array_key_exists(2, $disposition)) {
            if ($name !== 'files') throw new AppError(400, 'FORM_FIELDS', 'Проверьте поля формы.');
            preg_match('/^Content-Type:\s*([^\r\n]+)$/im', $headers, $mime);
            if ($content !== '' || $disposition[2] !== '') $files[] = ['name' => $disposition[2], 'mime' => trim($mime[1] ?? ''), 'data' => $content];
        } else {
            if (isset($fields[$name]) || !in_array($name, ['name', 'company', 'phone', 'email', 'service', 'task', 'consent', 'website', 'token', 'key'], true) || !mb_check_encoding($content, 'UTF-8')) throw new AppError(400, 'FORM_FIELDS', 'Проверьте поля формы.');
            $fields[$name] = $content;
        }
    }
    return [$fields, $files];
}

function requestForm(): array
{
    if (filter_var(ini_get('enable_post_data_reading'), FILTER_VALIDATE_BOOLEAN)) throw new \RuntimeException('RAW_MULTIPART_CONFIGURATION_REQUIRED');
    $max = limits()['maxTotalBytes'] + 131072;
    $length = $_SERVER['CONTENT_LENGTH'] ?? '';
    if ($length !== '' && (!ctype_digit($length) || (int)$length > $max)) throw new AppError(413, 'BODY_SIZE', 'Общий размер обращения превышает допустимый.');
    $stream = fopen('php://input', 'rb');
    if (!$stream) throw new AppError(400, 'EMPTY_BODY', 'Заполните форму обращения.');
    $body = '';
    try {
        while (!feof($stream)) { $body .= fread($stream, 65536); if (strlen($body) > $max) throw new AppError(413, 'BODY_SIZE', 'Общий размер обращения превышает допустимый.'); }
    } finally { fclose($stream); }
    return parseMultipart($body, $_SERVER['CONTENT_TYPE'] ?? '');
}
