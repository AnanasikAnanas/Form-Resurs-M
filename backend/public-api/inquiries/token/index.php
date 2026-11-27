<?php
declare(strict_types=1);
require dirname(__DIR__,4).'/private/backend/bootstrap.php';
\FormResurs\endpoint(static function():void { if(($_SERVER['REQUEST_METHOD']??'')!== 'GET')throw new \FormResurs\AppError(405,'METHOD','Метод не поддерживается.');\FormResurs\checkOrigin(false);$s=\FormResurs\settings();if(!$s['enabled'])throw new \FormResurs\AppError(503,'DISABLED','Приём заявок временно недоступен.');\FormResurs\rateLimit('token');$key=$_GET['key']??'';if(!is_string($key)||!\FormResurs\validUuid($key))throw new \FormResurs\AppError(400,'KEY','Обновите форму.');\FormResurs\respond(['ok'=>true,'token'=>\FormResurs\token($s['legal'],$key),'documentVersion'=>$s['documentVersion']]);});
