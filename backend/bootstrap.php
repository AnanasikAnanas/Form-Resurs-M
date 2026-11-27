<?php
declare(strict_types=1);
namespace FormResurs;

final class AppError extends \RuntimeException
{
    public function __construct(public int $status, public string $errorCode, string $message, public array $fields = []) { parent::__construct($message); }
}

ini_set('display_errors', '0');
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) return false;
    throw new \ErrorException($message, 0, $severity, $file, $line);
});
spl_autoload_register(static function (string $class): void {
    foreach (['PHPMailer\\PHPMailer\\' => __DIR__ . '/vendor/phpmailer/src/', 'setasign\\Fpdi\\' => __DIR__ . '/vendor/fpdi/src/'] as $prefix => $directory) {
        if (str_starts_with($class, $prefix)) {
            $file = $directory . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) require_once $file;
            return;
        }
    }
    if ($class === 'FPDF') require_once __DIR__ . '/vendor/fpdf/fpdf.php';
});
foreach (['Common', 'Security', 'Files', 'Applications', 'Notifications'] as $module) require_once __DIR__ . '/src/' . $module . '.php';
