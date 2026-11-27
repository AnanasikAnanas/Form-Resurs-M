"use client";
import { useEffect,useState, type ReactNode } from "react";
export function RemoteLegal({kind, fallback}:{kind:"policy"|"consent";fallback:ReactNode}) {
 const [document,setDocument]=useState<{text:string;version:string}|null>(null);
 useEffect(()=>{const controller=new AbortController();fetch('/api/inquiries/settings/',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():Promise.reject()).then(s=>{const l=s.legal;if(l&&typeof l[kind]==='string'&&typeof l[kind+'Version']==='string')setDocument({text:l[kind],version:l[kind+'Version']});}).catch(()=>{});return()=>controller.abort();},[kind]);
 return document?<><p className="muted">Утверждённая версия {document.version}</p>{document.text.split(/\n\s*\n/).map((p,i)=><p key={i}>{p}</p>)}</>:<>{fallback}</>;
}
