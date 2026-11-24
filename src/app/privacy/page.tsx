import { PageIntro, TextLink } from "@/components/editorial";
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
    <PageIntro title={title} current="Политика обработки данных" description={legal ? "Информация для посетителей сайта «Форм-Ресурс М»." : "Техническая страница ожидает утверждённых документов компании."} />
    <section className="section">
      <div className="wrap">
        <div className="prose">
          {legal
            ? <><h2>Политика</h2><p className="muted">Версия {legal.policyVersion}</p>{legal.policy.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}<h2 id="consent">Согласие на обработку персональных данных</h2><p className="muted">Версия {legal.consentVersion}</p>{legal.consent.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</>
            : <><h2 id="consent">Документы готовятся</h2><p>Перед публикацией компания должна заполнить и утвердить политику и текст согласия. В текущей версии форма обращения отключена.</p></>}
          <TextLink href="/contacts/">Вернуться к контактам</TextLink>
        </div>
      </div>
    </section>
  </>;
}
