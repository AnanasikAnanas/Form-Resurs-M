<?php
declare(strict_types=1);
namespace FormResurs;
function scan(string $bytes): void {
    $u=config()['uploads'];$addr=$u['clamav_address'];
    if(!preg_match('~^(unix:///.+|tcp://(127\.0\.0\.1|localhost):[0-9]+)$~D',$addr))throw new AppError(503,'SCANNER_UNAVAILABLE','Проверка файлов недоступна. Отправьте заявку без вложений.');
    $socket=@stream_socket_client($addr,$errno,$error,$u['scan_timeout']);if(!$socket)throw new AppError(503,'SCANNER_UNAVAILABLE','Проверка файлов недоступна. Отправьте заявку без вложений.');
    stream_set_timeout($socket,$u['scan_timeout']);
    try{$send=static function(string $v)use($socket):void{while($v!==''){$n=fwrite($socket,$v);if(!$n)throw new \RuntimeException('SCAN_WRITE');$v=substr($v,$n);}};$send("zINSTREAM\0");
        for($i=0;$i<strlen($bytes);$i+=65536){$part=substr($bytes,$i,65536);$send(pack('N',strlen($part)).$part);}$send(pack('N',0));$result=stream_get_line($socket,4096,"\0");
        if($result!==false&&str_ends_with($result,' FOUND'))throw new AppError(400,'FILE_SCAN','Файл не прошёл проверку безопасности.',['files'=>['Файл не прошёл проверку безопасности.']]);
        if($result!=='stream: OK')throw new \RuntimeException('SCAN_FAILED');
    }catch(AppError $e){throw $e;}catch(\Throwable){throw new AppError(503,'SCANNER_UNAVAILABLE','Проверка файлов недоступна. Отправьте заявку без вложений.');}finally{fclose($socket);}
}
function normalizePdf(string $bytes): string {
    try{
        $parser=new \setasign\Fpdi\PdfParser\PdfParser(\setasign\Fpdi\PdfParser\StreamReader::createByString($bytes));$xref=$parser->getCrossReference();if($xref->getSize()>50000)throw new \RuntimeException();
        $deny=['OpenAction','AA','JS','JavaScript','Launch','EmbeddedFiles','EmbeddedFile','XFA','RichMedia','AcroForm','URI','GoToR','GoToE','SubmitForm','ImportData','Sound','Movie','3D','Encrypt'];$seen=0;
        $inspect=function($v,int $depth=0)use(&$inspect,&$seen,$deny):void{if(++$seen>200000||$depth>100)throw new \RuntimeException();
            if($v instanceof \setasign\Fpdi\PdfParser\Type\PdfName&&in_array(\setasign\Fpdi\PdfParser\Type\PdfName::unescape($v->value),$deny,true))throw new \RuntimeException();
            if($v instanceof \setasign\Fpdi\PdfParser\Type\PdfDictionary)foreach($v->value as $key=>$value){if(in_array(\setasign\Fpdi\PdfParser\Type\PdfName::unescape($key),$deny,true))throw new \RuntimeException();$inspect($value,$depth+1);}
            if($v instanceof \setasign\Fpdi\PdfParser\Type\PdfArray)foreach($v->value as $value)$inspect($value,$depth+1);
            if($v instanceof \setasign\Fpdi\PdfParser\Type\PdfIndirectObject)$inspect($v->value,$depth+1);
            if($v instanceof \setasign\Fpdi\PdfParser\Type\PdfStream){foreach(['F','FFilter','FDecodeParms'] as $key)if(isset($v->value->value[$key]))throw new \RuntimeException();$inspect($v->value,$depth+1);}
        };$inspect($xref->getTrailer());for($i=1;$i<$xref->getSize();$i++)if($xref->getOffsetFor($i)!==false)$inspect($parser->getIndirectObject($i));
        $pdf=new \setasign\Fpdi\Fpdi();$pages=$pdf->setSourceFile(\setasign\Fpdi\PdfParser\StreamReader::createByString($bytes));if($pages<1||$pages>100)throw new \RuntimeException();
        for($i=1;$i<=$pages;$i++){$tpl=$pdf->importPage($i);$size=$pdf->getTemplateSize($tpl);$pdf->AddPage($size['orientation'],[$size['width'],$size['height']]);$pdf->useTemplate($tpl);}return $pdf->Output('S');
    }catch(\Throwable){throw new AppError(400,'FILE_UNSAFE','Этот PDF нельзя безопасно обработать.',['files'=>['Загрузите обычный PDF без интерактивных элементов.']]);}
}
function prepareFiles(array $files): array {
    $limits=limits();$types=['jpg'=>['image/jpeg',['jpg','jpeg']],'png'=>['image/png',['png']],'webp'=>['image/webp',['webp']],'pdf'=>['application/pdf',['pdf']]];
    if(count($files)>$limits['maxFiles'])throw new AppError(400,'FILE_COUNT','Слишком много файлов.');$total=0;$out=[];
    foreach($files as $f){$input=$f['data'];$name=$f['name'];$total+=strlen($input);if($total>$limits['maxTotalBytes'])throw new AppError(413,'FILES_TOTAL','Превышен общий размер файлов.');
        if(strlen($input)<1||strlen($input)>$limits['maxFileBytes'])throw new AppError(400,'FILE_SIZE','Превышен размер файла.');
        if(!mb_check_encoding($name,'UTF-8')||mb_strlen($name)>180||preg_match('~[/\\\\\x00-\x1f\x7f]~u',$name)||str_contains($name,'..'))throw new AppError(400,'FILE_NAME','Переименуйте файл.');
        $ext=strtolower(pathinfo($name,PATHINFO_EXTENSION));$format=null;foreach($limits['formats'] as $candidate)if(in_array($ext,$types[$candidate][1],true))$format=$candidate;
        if(!$format)throw new AppError(400,'FILE_FORMAT','Недопустимый формат файла.');$mime=(new \finfo(FILEINFO_MIME_TYPE))->buffer($input);
        if($mime!==$types[$format][0]||($f['mime']!==''&&!in_array($f['mime'],[$mime,'application/octet-stream'],true)))throw new AppError(400,'FILE_CONTENT','Тип файла не соответствует содержимому.');scan($input);
        if($format==='pdf')$data=normalizePdf($input);else{$size=@getimagesizefromstring($input);if(!$size||$size[0]*$size[1]>config()['uploads']['max_pixels'])throw new AppError(400,'FILE_UNSAFE','Изображение слишком велико или повреждено.');$im=@imagecreatefromstring($input);if(!$im)throw new AppError(400,'FILE_UNSAFE','Изображение повреждено.');ob_start();try{$ok=match($format){'jpg'=>imagejpeg($im,null,92),'png'=>imagepng($im,null,6),'webp'=>imagewebp($im,null,92)};$data=ob_get_contents();if(!$ok)throw new \RuntimeException('IMAGE_ENCODING');}finally{ob_end_clean();imagedestroy($im);}}
        if(strlen($data)>$limits['maxFileBytes'])throw new AppError(413,'FILE_SIZE','Обработанный файл слишком велик.');scan($data);$out[]=['id'=>uuid(),'name'=>$name,'mime'=>$mime,'data'=>$data,'inputHash'=>hash('sha256',$input)];}
    return $out;
}
