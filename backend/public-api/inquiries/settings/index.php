<?php
declare(strict_types=1);
require dirname(__DIR__,4).'/private/backend/bootstrap.php';
\FormResurs\endpoint(static function():void { if(($_SERVER['REQUEST_METHOD']??'')!== 'GET')throw new \FormResurs\AppError(405,'METHOD','Метод не поддерживается.');\FormResurs\checkOrigin(false);\FormResurs\respond(\FormResurs\settings());});
