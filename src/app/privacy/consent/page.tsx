import { PageIntro, TextLink } from "@/components/editorial";
import { operator, consentDraft } from "@/content/operator";
import { pageMeta } from "@/content/seo";
import { RemoteLegal } from "@/components/remote-legal";



const title = "Согласие на обработку персональных данных";
export const metadata = pageMeta(title, "Отдельный документ о согласии на обработку персональных данных.", "/privacy/consent/", false);

export default function ConsentPage() {
  return <>
    <PageIntro title={title} current="Согласие" parent={{ href: "/privacy/", label: "Политика обработки данных" }} description={"Проект документа. Требуется утверждение компанией."} />
    <section className="section"><div className="wrap"><div className="prose">
      <h2>Оператор</h2><p>{operator.name}. ИНН {operator.inn}.</p><p>{operator.address}</p><p>Email: <a href={`mailto:${operator.email}`}>{operator.email}</a></p>
      <RemoteLegal kind="consent" fallback={consentDraft.map((paragraph, index) => <p key={index}>{paragraph}</p>)} />
      <TextLink href="/privacy/">Политика обработки персональных данных</TextLink>
    </div></div></section>
  </>;
}
