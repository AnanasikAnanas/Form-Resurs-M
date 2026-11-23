"use client";

import { Suspense, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { services } from "@/content/services";

function ServiceSelect({ selected = "" }: { selected?: string }) {
  return <select name="service" key={selected} defaultValue={selected}>
    <option value="">Требуется консультация</option>
    {services.map(({ slug, title }) => <option key={slug} value={slug}>{title}</option>)}
  </select>;
}

function ServiceFromQuery() {
  const searchParams = useSearchParams();
  const selected = services.find(({ slug }) => slug === searchParams.get("service"))?.slug;
  return <ServiceSelect selected={selected} />;
}

export function InquiryForm({ recipient, consent }: { recipient: string | null; consent: string | null }) {
  const ready = Boolean(recipient && consent);

  function openEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipient || !consent) return;

    const data = new FormData(event.currentTarget);
    const service = services.find(({ slug }) => slug === data.get("service"));
    const body = [
      `Имя: ${data.get("name")}`,
      `Организация: ${data.get("organization") || "—"}`,
      `Контакт: ${data.get("contact")}`,
      `Услуга: ${service?.title ?? "Требуется консультация"}`,
      "",
      String(data.get("task") ?? ""),
      "",
      consent,
    ].join("\r\n");

    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent("Обращение в мастерскую «Форм-Ресурс М»")}&body=${encodeURIComponent(body)}`;
  }

  return <form className="inquiry-form" aria-describedby="inquiry-note" onSubmit={openEmail}>
    <p id="inquiry-note" className="inquiry-note">{ready
      ? "Откроется почтовая программа с черновиком. Проверьте его и отправьте письмо."
      : "Форма станет доступна после настройки контактной почты."}</p>
    <fieldset disabled={!ready}>
      <legend className="sr-only">Данные для обращения</legend>
      <div className="form-pair">
        <label>Имя<input name="name" autoComplete="name" required maxLength={100} /></label>
        <label>Организация<input name="organization" autoComplete="organization" maxLength={120} /></label>
      </div>
      <label>Телефон или email<input name="contact" required maxLength={150} /></label>
      <label>Услуга<Suspense fallback={<ServiceSelect />}><ServiceFromQuery /></Suspense></label>
      <label>Описание задачи<textarea name="task" rows={4} required maxLength={1000} /></label>
      <label className="consent"><input type="checkbox" name="consent" required /><span>{consent ?? "Согласие на обработку персональных данных"}</span></label>
      <button type="submit" className="action action-primary">Открыть почтовую программу <ArrowUpRight size={18} aria-hidden="true" /></button>
    </fieldset>
    <Link className="policy-link" href="/privacy/">Политика обработки персональных данных</Link>
  </form>;
}
