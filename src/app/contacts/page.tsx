import { ArrowUpRight } from "lucide-react";
import { PageIntro } from "@/components/editorial";
import { InquiryForm } from "@/components/inquiry-form";
import { pageMeta } from "@/content/seo";
import { site } from "@/content/site";
import { getInquiryAvailability } from "@/server/legal";
import { reportEvent } from "@/server/errors";
import type { InquirySettings } from "@/lib/inquiry-schema";

export const dynamic = "force-dynamic";

const description = "Контакты слесарной мастерской «Форм-Ресурс М» в Подольске.";
export const metadata = pageMeta("Контакты", description, "/contacts/");

export default async function ContactsPage() {
  const { contact, showPlaceholders } = site;
  let settings: InquirySettings = { enabled: false, limits: { maxFiles: 5, maxFileBytes: 5 * 1024 * 1024, maxTotalBytes: 15 * 1024 * 1024, formats: ["jpg", "png", "webp", "pdf"] }, documentVersion: "" };
  try {
    const availability = await getInquiryAvailability();
    settings = { enabled: availability.enabled, limits: availability.config.limits, documentVersion: availability.legal ? `${availability.legal.policyHash}:${availability.legal.consentHash}` : "" };
  } catch { reportEvent("INQUIRY_CONFIGURATION_UNAVAILABLE"); }
  const fields = [
    { label: "Адрес", value: contact.address },
    { label: "Телефон", value: contact.phone?.display, href: contact.phone?.href },
    { label: "Электронная почта", value: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
    { label: "График работы", value: contact.schedule },
  ];

  return <>
    <PageIntro title="Контакты" description="Мастерская «Форм-Ресурс М» находится в Подольске, Московская область." />
    <section className="section" aria-labelledby="contact-information">
      <div className="wrap detail-grid contact-grid">
        <div>
          <h2 id="contact-information">Как связаться</h2>
          <dl className="contact-details">
            {fields.filter(({ value }) => value || showPlaceholders).map(({ label, value, href }) => (
              <div key={label}><dt>{label}</dt><dd>{href ? <a href={href}>{value}</a> : value ?? <span className="muted">Уточняется</span>}</dd></div>
            ))}
            {(contact.legalDetails?.length || showPlaceholders) ? <div><dt>Реквизиты</dt><dd>
              {contact.legalDetails?.length ? contact.legalDetails.map((line) => <span key={line}>{line}</span>) : <span className="muted">Уточняются</span>}
            </dd></div> : null}
          </dl>
        </div>
        {(contact.mapUrl || showPlaceholders) && <div className="location-panel">
          <p className="location-region">{site.region}</p>
          <p className="location-city">{site.city}</p>
          {contact.mapUrl ? <a className="text-link" href={contact.mapUrl}>Открыть карту <ArrowUpRight size={17} aria-hidden="true" /></a>
            : <p className="muted">Точный адрес и схема проезда уточняются.</p>}
        </div>}
      </div>
    </section>
    <section className="section process-section" id="inquiry" aria-labelledby="inquiry-title">
      <div className="wrap detail-grid">
        <div><h2 id="inquiry-title">Обсудить задачу</h2><p className="section-caption">Опишите тип пресс-формы, заметные дефекты и желаемый результат.</p></div>
        <InquiryForm settings={settings} />
      </div>
    </section>
  </>;
}
