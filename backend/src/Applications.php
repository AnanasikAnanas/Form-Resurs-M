<?php
declare(strict_types=1);
namespace FormResurs;
function validate(array $fields): array {
    $rules=['name'=>[2,100],'company'=>[2,200],'phone'=>[10,40],'email'=>[3,254],'service'=>[1,40],'task'=>[10,6000]];$errors=[];$data=[];
    foreach($rules as $key=>[$min,$max]){$v=trim($fields[$key]??'');$data[$key]=$v;if(!mb_check_encoding($v,'UTF-8')||mb_strlen($v)<$min||mb_strlen($v)>$max||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$v))$errors[$key]=['Проверьте поле.'];}
    $digits=preg_replace('/\D/','',$data['phone']);if(!preg_match('/^[+\d()\s-]+$/D',$data['phone'])||strlen($digits)<10||strlen($digits)>15)$errors['phone']=['Проверьте телефон.'];
    if(!filter_var($data['email'],FILTER_VALIDATE_EMAIL))$errors['email']=['Проверьте email.'];
    if(!in_array($data['service'],['mold-repair','mold-maintenance','laser-welding','mold-polishing'],true))$errors['service']=['Выберите услугу.'];
    if(($fields['consent']??'')!=='yes')$errors['consent']=['Необходимо согласие.'];
    if($errors)throw new AppError(422,'VALIDATION','Проверьте поля формы.',$errors);
    return $data;
}
function save(array $data,array $files,string $key,array $legal): array {
    $hash=hash('sha256',json(['data'=>$data,'files'=>array_map(static fn($f)=>[$f['name'],$f['inputHash']],$files),'policy'=>$legal['policyHash'],'consent'=>$legal['consentHash']]));
    $db=db();$check=$db->prepare('SELECT id,fingerprint FROM Application WHERE idempotencyKey=?');$check->execute([$key]);$existing=$check->fetch(\PDO::FETCH_ASSOC);
    if($existing){if(!hash_equals($existing['fingerprint'],$hash))throw new AppError(409,'IDEMPOTENCY','Предыдущая заявка уже сохранена.');return ['ok'=>true,'id'=>$existing['id']];}
    $id=uuid();$now=utc();$expires=utc(time()+config()['retention_days']*86400);$db->beginTransaction();
    try{
        $q=$db->prepare('INSERT INTO Application (id,idempotencyKey,fingerprint,name,company,phone,email,service,task,consentAcceptedAt,policyVersion,consentVersion,policyHash,consentHash,policyText,consentText,createdAt,expiresAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $q->execute([$id,$key,$hash,$data['name'],$data['company'],$data['phone'],$data['email'],$data['service'],$data['task'],$now,$legal['policyVersion'],$legal['consentVersion'],$legal['policyHash'],$legal['consentHash'],$legal['policy'],$legal['consent'],$now,$expires]);
        $q=$db->prepare('INSERT INTO ApplicationFile (id,applicationId,originalName,mime,size,sha256,content) VALUES (?,?,?,?,?,?,?)');
        foreach($files as $f)$q->execute([$f['id'],$id,$f['name'],$f['mime'],strlen($f['data']),hash('sha256',$f['data']),$f['data']]);
        $q=$db->prepare('INSERT INTO NotificationJob (id,applicationId,nextAttemptAt) VALUES (?,?,?)');$q->execute([uuid(),$id,$now]);$db->commit();
    }catch(\Throwable $e){if($db->inTransaction())$db->rollBack();$check->execute([$key]);$existing=$check->fetch(\PDO::FETCH_ASSOC);if($existing&&hash_equals($existing['fingerprint'],$hash))return ['ok'=>true,'id'=>$existing['id']];throw $e;}
    return ['ok'=>true,'id'=>$id];
}
function submit(): never {
    checkOrigin(true);$settings=settings();if(!$settings['enabled'])throw new AppError(503,'DISABLED','Приём заявок временно недоступен.');rateLimit('submit');[$fields,$raw]=requestForm();
    if(($fields['website']??'')!=='')throw new AppError(400,'FORM_REJECTED','Не удалось проверить обращение.');$key=$fields['key']??'';if(!validUuid($key))throw new AppError(400,'FORM_TOKEN','Обновите форму.');
    verifyToken($fields['token']??'',$key,$settings['legal']);$data=validate($fields);$files=prepareFiles($raw);respond(save($data,$files,$key,$settings['legal']),201);
}
