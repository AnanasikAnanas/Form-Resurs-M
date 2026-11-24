import { ContactBand, PageIntro, Process, TextLink } from "@/components/editorial";
import { WorkshopPhoto } from "@/components/workshop-photo";
import { workshopPhotos } from "@/content/workshop";
import { pageMeta } from "@/content/seo";

export const metadata = pageMeta("О компании", "Форм-Ресурс М — слесарная мастерская по ремонту и обслуживанию пресс-форм в Подольске, Московская область.", "/about/");

export default function AboutPage() {
  return <>
    <PageIntro title="О компании" label="Подольск / Московская область" description="«Форм-Ресурс М» — слесарная мастерская по ремонту и обслуживанию пресс-форм." photo={workshopPhotos.bench} />
    <section className="section"><div className="wrap split">
      <h2>Слесарная мастерская</h2>
      <div className="paragraph-stack">
        <p className="section-lede">Мастерская работает с пресс-формами, которым требуется обслуживание, восстановление или доводка рабочих поверхностей.</p>
        <p>Чтобы определить подходящую услугу, учитываем назначение оснастки, признаки износа и требования к результату. Возможность и объём конкретных операций обсуждаем по исходным данным.</p>
        <TextLink href="/services/">Посмотреть услуги</TextLink>
      </div>
    </div></section>
    <section className="section production-base"><div className="wrap">
      <div className="section-heading"><h2>Производственная база</h2></div>
      <div className="production-overview">
        <WorkshopPhoto photo="overview" />
        <div className="production-detail"><h3>Рабочие места и оборудование</h3><p>Общий вид оборудования и отдельных рабочих мест мастерской.</p><WorkshopPhoto photo="optical" /></div>
      </div>
      <div className="production-machines" aria-label="Фотографии производственной базы">
        <WorkshopPhoto photo="lathe" />
        <WorkshopPhoto photo="grinder" />
      </div>
    </div></section>
    <Process />
    <ContactBand />
  </>;
}
