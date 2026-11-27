import { PageIntro, TextLink } from "@/components/editorial";
import { operator, privacyDraft } from "@/content/operator";
import { pageMeta } from "@/content/seo";
import { getLegalDocuments } from "@/server/legal";
import { reportEvent } from "@/server/errors";

export const dynamic = "force-dynamic";
const title = "Политика обработки персональных данных";
export const metadata = pageMeta(title, "Информация об обработке персональных данных при обращении в мастерскую.", "/privacy/", false);

export default async function PrivacyPage() {
  let legal: Awaited<ReturnType<typeof getLegalDocuments>> = null;
  try { legal = await getLegalDocuments(); }
  catch { reportEvent("LEGAL_DOCUMENT_UNAVAILABLE"); }
  return <>
    <PageIntro title={title} current="Политика обработки данных" description={legal ? "Информация для посетителей сайта «Форм-Ресурс М»." : "Проект документа. Требуется утверждение компанией."} />
    <section className="section"><div className="wrap"><div className="prose">
      <h2>Оператор</h2><p>{operator.name}. ИНН {operator.inn}.</p><p>{operator.address}</p><p>Email: <a href={`mailto:${operator.email}`}>{operator.email}</a></p>
      {legal ? <><h2>Политика</h2><p className="muted">Версия {legal.policyVersion}</p>{legal.policy.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</> : privacyDraft.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <h2 id="consent">Отдельное согласие</h2><TextLink href="/privacy/consent/">Согласие на обработку персональных данных</TextLink>
      <p><TextLink href="/contacts/">Вернуться к контактам</TextLink></p>
    </div></div></section>
  </>;
}
