<?php
declare(strict_types=1);
namespace FormResurs;
function claimJob(): array|false {
    $db=db();$max=config()['smtp']['max_attempts'];$db->beginTransaction();
    try{$db->prepare("UPDATE NotificationJob SET status='FAILED',lastErrorCode='ATTEMPTS_EXHAUSTED',leaseUntil=NULL,leaseToken=NULL WHERE attempts>=? AND status<>'SENT' AND (leaseUntil IS NULL OR leaseUntil<UTC_TIMESTAMP())")->execute([$max]);
        $q=$db->prepare("SELECT id,applicationId,attempts FROM NotificationJob WHERE attempts<? AND ((status IN ('PENDING','RETRY') AND nextAttemptAt<=UTC_TIMESTAMP()) OR (status='SENDING' AND leaseUntil<UTC_TIMESTAMP())) ORDER BY nextAttemptAt,id LIMIT 1 FOR UPDATE");$q->execute([$max]);$job=$q->fetch(\PDO::FETCH_ASSOC);
        if(!$job){$db->commit();return false;}$job['leaseToken']=uuid();$job['attempts']++;
        $db->prepare("UPDATE NotificationJob SET status='SENDING',attempts=?,leaseToken=?,leaseUntil=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 300 SECOND) WHERE id=?")->execute([$job['attempts'],$job['leaseToken'],$job['id']]);$db->commit();return $job;
    }catch(\Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
}
function buildMail(array $app,array $files): \PHPMailer\PHPMailer\PHPMailer {
    $s=config()['smtp'];if(!$s['host']||!filter_var($s['from'],FILTER_VALIDATE_EMAIL)||!filter_var($s['project_manager_email'],FILTER_VALIDATE_EMAIL))throw new \RuntimeException('SMTP_CONFIG');
    $mail=new \PHPMailer\PHPMailer\PHPMailer(true);$mail->isSMTP();$mail->Host=$s['host'];$mail->Port=$s['port'];$mail->SMTPSecure=$s['secure'];$mail->SMTPAuth=$s['user']!=='';$mail->Username=$s['user'];$mail->Password=$s['password'];$mail->Timeout=20;$mail->CharSet='UTF-8';$mail->setFrom($s['from'],'Форм-Ресурс М');$mail->addAddress($s['project_manager_email']);$mail->addReplyTo($app['email']);$mail->Subject='Заявка '.$app['id'];$mail->MessageID='<application-'.$app['id'].'@'.parse_url(config()['origin'],PHP_URL_HOST).'>';
    $body=['Номер: '.$app['id'],'Дата UTC: '.$app['createdAt'],'Имя: '.$app['name'],'Организация: '.$app['company'],'Телефон: '.$app['phone'],'Email: '.$app['email'],'Услуга: '.$app['service'],'Задача: '.$app['task']];$estimate=65536;
    foreach($files as $f)$estimate+=ceil($f['size']*1.4)+4096;
    if($estimate<=$s['attachment_max_mb']*1048576){$q=db()->prepare('SELECT content FROM ApplicationFile WHERE id=? AND applicationId=?');foreach($files as $f){$q->execute([$f['id'],$app['id']]);$data=$q->fetchColumn();if(!is_string($data)||!hash_equals($f['sha256'],hash('sha256',$data)))throw new \RuntimeException('FILE_INTEGRITY');$mail->addStringAttachment($data,$f['originalName'],'base64',$f['mime']);}}
    elseif($files){$body[]='Файлы сохранены в БД, размер превышает почтовый лимит. Для получения обратитесь к администратору закрытого хранилища.';foreach($files as $f)$body[]=$f['id'].' — '.$f['originalName'];}
    $mail->Body=implode("\n\n",$body);return $mail;
}
function deliverJob(array $job): void {
    $db=db();$db->beginTransaction();
    try{$q=$db->prepare('SELECT id,name,company,phone,email,service,task,createdAt,expiresAt FROM Application WHERE id=? FOR UPDATE');$q->execute([$job['applicationId']]);$app=$q->fetch(\PDO::FETCH_ASSOC);if(!$app){$db->rollBack();return;}
        $q=$db->prepare('SELECT id,originalName,mime,size,sha256 FROM ApplicationFile WHERE applicationId=?');$q->execute([$app['id']]);$files=$q->fetchAll(\PDO::FETCH_ASSOC);$status='RETRY';$error=null;$sent=null;
        if($app['expiresAt']<=utc()){$status='FAILED';$error='EXPIRED';}else try{$mail=buildMail($app,$files);$mail->send();$status='SENT';$sent=utc();}catch(\Throwable){$error='SMTP_FAILED';}
        if($status==='RETRY'&&$job['attempts']>=config()['smtp']['max_attempts'])$status='FAILED';$delay=min(86400,60*2**min(10,$job['attempts']-1))+random_int(0,30);
        $db->prepare('UPDATE NotificationJob SET status=?,sentAt=?,lastErrorCode=?,leaseUntil=NULL,leaseToken=NULL,nextAttemptAt=? WHERE id=? AND leaseToken=?')->execute([$status,$sent,$error,utc(time()+$delay),$job['id'],$job['leaseToken']]);$db->commit();
    }catch(\Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
}
