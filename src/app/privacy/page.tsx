import { PageIntro, TextLink } from "@/components/editorial";
import { operator, privacyDraft } from "@/content/operator";
import { pageMeta } from "@/content/seo";
import { RemoteLegal } from "@/components/remote-legal";



const title = "Политика обработки персональных данных";
export const metadata = pageMeta(title, "Информация об обработке персональных данных при обращении в мастерскую.", "/privacy/", false);

export default function PrivacyPage() {
  return <>
    <PageIntro title={title} current="Политика обработки данных" description={"Проект документа. Требуется утверждение компанией."} />
    <section className="section"><div className="wrap"><div className="prose">
      <h2>Оператор</h2><p>{operator.name}. ИНН {operator.inn}.</p><p>{operator.address}</p><p>Email: <a href={`mailto:${operator.email}`}>{operator.email}</a></p>
      <RemoteLegal kind="policy" fallback={privacyDraft.map((paragraph, index) => <p key={index}>{paragraph}</p>)} />
      <h2 id="consent">Отдельное согласие</h2><TextLink href="/privacy/consent/">Согласие на обработку персональных данных</TextLink>
      <p><TextLink href="/contacts/">Вернуться к контактам</TextLink></p>
    </div></div></section>
  </>;
}
