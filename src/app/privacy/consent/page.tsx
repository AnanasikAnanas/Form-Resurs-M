import { PageIntro, TextLink } from "@/components/editorial";
import { operator, consentDraft } from "@/content/operator";
import { pageMeta } from "@/content/seo";
import { getLegalDocuments } from "@/server/legal";
import { reportEvent } from "@/server/errors";

export const dynamic = "force-dynamic";
const title = "Согласие на обработку персональных данных";
export const metadata = pageMeta(title, "Отдельный документ о согласии на обработку персональных данных.", "/privacy/consent/", false);

export default async function ConsentPage() {
  let legal: Awaited<ReturnType<typeof getLegalDocuments>> = null;
  try { legal = await getLegalDocuments(); }
  catch { reportEvent("LEGAL_DOCUMENT_UNAVAILABLE"); }
  return <>
    <PageIntro title={title} current="Согласие" parent={{ href: "/privacy/", label: "Политика обработки данных" }} description={legal ? "Отдельное согласие для формы обращения." : "Проект документа. Требуется утверждение компанией."} />
    <section className="section"><div className="wrap"><div className="prose">
      <h2>Оператор</h2><p>{operator.name}. ИНН {operator.inn}.</p><p>{operator.address}</p><p>Email: <a href={`mailto:${operator.email}`}>{operator.email}</a></p>
      {legal ? <><p className="muted">Версия {legal.consentVersion}</p>{legal.consent.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</> : consentDraft.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <TextLink href="/privacy/">Политика обработки персональных данных</TextLink>
    </div></div></section>
  </>;
}
