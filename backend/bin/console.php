<?php
declare(strict_types=1);
namespace FormResurs;
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/bootstrap.php';
try{
    $cmd=$argv[1]??'';$id=$argv[2]??'';$db=db();
    if($cmd==='migrate'&&$id==='--apply'){$db->exec(file_get_contents(dirname(__DIR__).'/migrations/001.sql'));echo "Schema ready\n";}
    elseif($cmd==='notifications'){for($i=0;$i<10;$i++){$job=claimJob();if(!$job)break;deliverJob($job);}echo "Done\n";}
    elseif($cmd==='cleanup'){$q=$db->prepare('DELETE FROM Application WHERE expiresAt<UTC_TIMESTAMP() LIMIT 100');$q->execute();$db->exec('DELETE FROM RateLimit WHERE expiresAt<UTC_TIMESTAMP()');echo "Done\n";}
    elseif($cmd==='delete'&&validUuid($id)&&($argv[3]??'')==='--confirm'){$db->prepare('DELETE FROM Application WHERE id=?')->execute([$id]);echo "Deleted; remove email/backup copies separately\n";}
    elseif($cmd==='show'&&validUuid($id)){$q=$db->prepare('SELECT id,name,company,phone,email,service,task,createdAt FROM Application WHERE id=?');$q->execute([$id]);echo json($q->fetch(\PDO::FETCH_ASSOC)?:[])."\n";}
    elseif($cmd==='file'&&validUuid($id)){$dir=realpath($argv[3]??'');$private=realpath(dirname(__DIR__).'/private/exports');if(!$dir||!$private||$dir!==$private||(fileperms($dir)&0077)!==0)throw new \RuntimeException('PRIVATE_EXPORT_DIRECTORY_REQUIRED');$q=$db->prepare('SELECT mime,sha256,content FROM ApplicationFile WHERE id=?');$q->execute([$id]);$file=$q->fetch(\PDO::FETCH_ASSOC);if(!$file||!hash_equals($file['sha256'],hash('sha256',$file['content'])))throw new \RuntimeException('FILE_NOT_FOUND');$ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','application/pdf'=>'pdf'][$file['mime']];$target=$dir.'/'.$id.'.'.$ext;$old=umask(0077);try{$handle=fopen($target,'xb');fwrite($handle,$file['content']);fclose($handle);}finally{umask($old);}echo $target."\n";}
    else{fwrite(STDERR,"migrate --apply | notifications | cleanup | delete ID --confirm | show ID | file ID PRIVATE_EXPORTS\n");exit(1);}
}catch(\Throwable){fwrite(STDERR,"Operation failed; verify private configuration and database.\n");exit(1);}
