"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, LoaderCircle, X } from "lucide-react";
import { services } from "@/content/services";
import { fileFormats, inquirySchema, type FieldErrors, type InquirySettings } from "@/lib/inquiry-schema";

function ServiceSelect({ selected = "", invalid }: { selected?: string; invalid?: boolean }) {
  return <select name="service" key={selected} defaultValue={selected} required aria-invalid={invalid} aria-describedby={invalid ? "service-error" : undefined}>
    <option value="">Выберите услугу</option>
    {services.map(({ slug, title }) => <option key={slug} value={slug}>{title}</option>)}
  </select>;
}

function ServiceFromQuery({ invalid }: { invalid?: boolean }) {
  const query = useSearchParams();
  return <ServiceSelect selected={services.find(({ slug }) => slug === query.get("service"))?.slug} invalid={invalid} />;
}

export function InquiryForm({ settings }: { settings: InquirySettings }) {
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [token, setToken] = useState("");
  const [tokenAttempt, setTokenAttempt] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const { limits, enabled } = settings;
  const accept = limits.formats.flatMap((format) => fileFormats[format].extensions.map((extension) => "." + extension)).join(",");
  const mb = (bytes: number) => Math.round(bytes / 1024 / 1024 * 10) / 10;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetch("/api/inquiries/token/?key=" + key, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.ok || typeof body.token !== "string") throw new Error(body.message || "Не удалось подготовить отправку.");
        if (body.documentVersion !== settings.documentVersion) throw new Error("Документы компании обновились. Обновите страницу и ознакомьтесь с ними перед отправкой.");
        setToken(body.token);
        setMessage("");
      })
      .catch((error: unknown) => {
        if (controller.signal.reason !== "cleanup") setMessage(controller.signal.aborted ? "Подготовка отправки заняла слишком много времени. Проверьте соединение и повторите попытку." : error instanceof Error ? error.message : "Не удалось подготовить отправку.");
      })
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort("cleanup"); };
  }, [enabled, key, tokenAttempt, settings.documentVersion]);

  useEffect(() => { if (result) resultRef.current?.focus(); }, [result]);
  useEffect(() => {
    if (message && !sending) {
      const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      (firstInvalid || feedbackRef.current)?.focus();
    }
  }, [errors, message, sending]);

  function retryPreparation() {
    setMessage("");
    setTokenAttempt((attempt) => attempt + 1);
  }

  function errorFor(field: keyof FieldErrors) {
    const text = errors[field]?.[0];
    return text ? <span className="field-error" id={field + "-error"}>{text}</span> : null;
  }

  function invalid(field: keyof FieldErrors) {
    return { "aria-invalid": Boolean(errors[field]?.length), "aria-describedby": errors[field]?.length ? field + "-error" : undefined };
  }

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)];
    let error = "";
    if (next.length > limits.maxFiles) error = "Разрешено не более " + limits.maxFiles + " файлов.";
    else if (next.some((file) => !file.size || file.size > limits.maxFileBytes)) error = "Один из файлов пуст или превышает " + mb(limits.maxFileBytes) + " МБ.";
    else if (next.reduce((sum, file) => sum + file.size, 0) > limits.maxTotalBytes) error = "Общий размер файлов превышает " + mb(limits.maxTotalBytes) + " МБ.";
    else if (next.some((file) => !limits.formats.some((format) => (fileFormats[format].extensions as readonly string[]).includes(file.name.split(".").pop()?.toLowerCase() || "")))) error = "Недопустимый формат файла.";
    setErrors((previous) => ({ ...previous, files: error ? [error] : undefined }));
    if (!error) setFiles(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || !token || busy.current || success) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = Object.fromEntries(["name", "company", "phone", "email", "service", "task", "consent"].map((name) => [name, data.get(name)]));
    const parsed = inquirySchema.safeParse(input);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      setMessage("Проверьте выделенные поля.");
      return;
    }
    setErrors({});
    setMessage("");
    setResult("");
    busy.current = true;
    setSending(true);
    for (const [name, value] of Object.entries(parsed.data)) data.set(name, value);
    data.delete("files");
    for (const file of files) data.append("files", file);
    data.set("token", token);
    data.set("key", key);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let failureMessage = "";
    try {
      const response = await fetch("/api/inquiries/", { method: "POST", body: data, signal: controller.signal });
      const body = await response.json();
      if (!response.ok || body.ok !== true || typeof body.id !== "string") {
        if (body.fieldErrors) setErrors(body.fieldErrors);
        if (["FORM_TOKEN", "FORM_EXPIRED"].includes(body.code)) {
          setToken("");
          setTokenAttempt((attempt) => attempt + 1);
        }
        failureMessage = body.message || "Не удалось отправить обращение. Повторите попытку.";
        throw new Error("API_ERROR");
      }
      setSuccess(true);
      setResult("Обращение сохранено. Номер: " + body.id + ". Менеджер свяжется с вами по указанным контактам.");
      form.reset();
      setFiles([]);
    } catch {
      setMessage(failureMessage || "Не удалось подтвердить отправку. Проверьте соединение и повторите попытку. Повторная отправка с теми же данными не создаст дубликат.");
    } finally {
      clearTimeout(timeout);
      busy.current = false;
      setSending(false);
    }
  }

  return <form ref={formRef} className="inquiry-form" aria-describedby="inquiry-note" onSubmit={submit} noValidate>
    <p id="inquiry-note" className="inquiry-note">{enabled ? "После отправки обращение будет сохранено. Вложения доступны только ответственным сотрудникам." : "Онлайн-приём обращений временно недоступен. Попробуйте зайти позже."}</p>
    {message && <div ref={feedbackRef} tabIndex={-1} className="form-feedback form-feedback-error" role="alert"><p>{message}</p>{enabled && !token && <button type="button" className="text-link" onClick={retryPreparation}>Повторить подготовку формы</button>}</div>}
    {result && <div ref={resultRef} tabIndex={-1} className="form-feedback" role="status"><p>{result}</p><button type="button" className="text-link" onClick={() => { setSuccess(false); setResult(""); setToken(""); setKey(crypto.randomUUID()); }}>Новое обращение</button></div>}
    <fieldset disabled={!enabled || sending || success} aria-busy={sending}>
      <legend className="sr-only">Данные для обращения</legend>
      <div className="form-pair">
        <label>Имя заказчика<input name="name" autoComplete="name" required minLength={2} maxLength={100} {...invalid("name")} />{errorFor("name")}</label>
        <label>Название предприятия<input name="company" autoComplete="organization" required minLength={2} maxLength={200} {...invalid("company")} />{errorFor("company")}</label>
      </div>
      <div className="form-pair">
        <label>Телефон<input name="phone" type="tel" autoComplete="tel" required maxLength={40} {...invalid("phone")} />{errorFor("phone")}</label>
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} {...invalid("email")} />{errorFor("email")}</label>
      </div>
      <label>Услуга<Suspense fallback={<ServiceSelect invalid={Boolean(errors.service)} />}><ServiceFromQuery invalid={Boolean(errors.service)} /></Suspense>{errorFor("service")}</label>
      <label>Описание задачи<textarea name="task" rows={5} required minLength={10} maxLength={6000} {...invalid("task")} />{errorFor("task")}</label>
      <div className="upload-field">
        <label>Фотографии и документы<input name="files" type="file" multiple accept={accept} aria-describedby={errors.files ? "file-hint files-error" : "file-hint"} aria-invalid={Boolean(errors.files)} onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} /></label>
        <p id="file-hint" className="field-hint">До {limits.maxFiles} файлов, до {mb(limits.maxFileBytes)} МБ каждый и {mb(limits.maxTotalBytes)} МБ суммарно. {limits.formats.map((format) => fileFormats[format].label).join(", ")}. Не прикладывайте лишние персональные данные.</p>
        {errorFor("files")}
        {files.length > 0 && <ul className="upload-list">{files.map((file, index) => <li key={file.name + ":" + index}><span>{file.name} <small>{mb(file.size)} МБ</small></span><button type="button" aria-label={"Удалить " + file.name} onClick={() => { setFiles((previous) => previous.filter((_, at) => at !== index)); setErrors((previous) => ({ ...previous, files: undefined })); }}><X size={18} aria-hidden="true" /></button></li>)}</ul>}
      </div>
      <div className="form-trap" aria-hidden="true"><label>Ваш сайт<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="consent"><input type="checkbox" name="consent" value="yes" required {...invalid("consent")} /><span>Даю <Link href="/privacy/#consent" target="_blank" rel="noopener">согласие на обработку персональных данных</Link> для рассмотрения обращения. {errorFor("consent")}</span></label>
      <button type="submit" disabled={!token || sending || success} className="action action-primary">{sending ? <><LoaderCircle size={18} className="sending-spinner" aria-hidden="true" />Отправляем…</> : <>{enabled ? token ? "Отправить обращение" : message ? "Отправка не подготовлена" : "Подготовка отправки…" : "Отправка пока недоступна"}<ArrowUpRight size={18} aria-hidden="true" /></>}</button>
      {sending && <p className="field-hint" role="status">Проверяем и сохраняем обращение. Дождитесь подтверждения.</p>}
    </fieldset>
    <Link className="policy-link" href="/privacy/">Политика обработки персональных данных</Link>
  </form>;
}
