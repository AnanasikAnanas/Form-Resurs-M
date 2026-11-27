<?php
declare(strict_types=1);
return [
    'production' => true,
    'enabled' => false,
    'origin' => 'https://example.invalid',
    'secret' => '',
    'db' => ['host' => 'localhost', 'port' => 3306, 'name' => '', 'user' => '', 'password' => ''],
    'legal' => ['approved' => false, 'policy_file' => '', 'consent_file' => '', 'policy_version' => '', 'consent_version' => ''],
    'retention_days' => null,
    'uploads' => ['max_files' => 5, 'max_file_mb' => 10, 'max_total_mb' => 20, 'formats' => ['jpg', 'png', 'webp', 'pdf'], 'max_pixels' => 12000000, 'scan_required' => true, 'clamav_address' => '', 'scan_timeout' => 15],
    'smtp' => ['host' => '', 'port' => 587, 'secure' => 'tls', 'user' => '', 'password' => '', 'from' => '', 'project_manager_email' => '', 'attachment_max_mb' => 10, 'max_attempts' => 8],
    'rate_limit' => ['window_seconds' => 900, 'max_requests' => 5, 'global_per_minute' => 30],
    'trusted_proxy_ips' => [],
];
