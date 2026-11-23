import { PageIntro, TextLink } from "@/components/editorial";
import { pageMeta } from "@/content/seo";
import { site } from "@/content/site";

const title = "Политика обработки персональных данных";
export const metadata = pageMeta(title, "Информация об обработке персональных данных при обращении в мастерскую.", "/privacy/", false);

export default function PrivacyPage() {
  return <>
    <PageIntro title={title} current="Политика обработки данных" description={site.privacy.approvedText ? "Информация для посетителей сайта «Форм-Ресурс М»." : "Техническая страница ожидает утверждённого текста компании."} />
    <section className="section">
      <div className="wrap">
        <div className="prose">
          {site.privacy.approvedText
            ? site.privacy.approvedText.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)
            : <><h2>Документ готовится</h2><p>Перед публикацией компания должна заполнить и утвердить политику и текст согласия. В текущей версии форма обращения отключена.</p></>}
          <TextLink href="/contacts/">Вернуться к контактам</TextLink>
        </div>
      </div>
    </section>
  </>;
}
