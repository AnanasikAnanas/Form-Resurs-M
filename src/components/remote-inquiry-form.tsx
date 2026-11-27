"use client";
import { useEffect, useState } from "react";
import { InquiryForm } from "./inquiry-form";
import type { InquirySettings } from "@/lib/inquiry-schema";
const fallback: InquirySettings = { enabled: false, limits: { maxFiles: 5, maxFileBytes: 10485760, maxTotalBytes: 20971520, formats: ["jpg","png","webp","pdf"] }, documentVersion: "" };
export function RemoteInquiryForm() {
  const [settings,setSettings]=useState<InquirySettings>(fallback);
  useEffect(()=>{const controller=new AbortController();fetch('/api/inquiries/settings/',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():Promise.reject()).then(s=>{if(s.ok&&typeof s.enabled==='boolean'&&s.limits&&Array.isArray(s.limits.formats)&&s.limits.formats.every((v:string)=>['jpg','png','webp','pdf'].includes(v))&&s.limits.maxFiles>0&&s.limits.maxFiles<=10&&s.limits.maxFileBytes<=10485760&&s.limits.maxTotalBytes<=20971520&&(!s.enabled||(s.legal&&s.documentVersion===s.legal.policyHash+':'+s.legal.consentHash)))setSettings({enabled:s.enabled,limits:s.limits,documentVersion:s.documentVersion});}).catch(()=>{});return()=>controller.abort();},[]);
  return <InquiryForm settings={settings}/>;
}
