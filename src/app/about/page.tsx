import { ContactBand, PageIntro, Process, TextLink } from "@/components/editorial";
import { pageMeta } from "@/content/seo";

export const metadata = pageMeta("О компании", "Форм-Ресурс М — слесарная мастерская по ремонту и обслуживанию пресс-форм в Подольске, Московская область.", "/about/");

export default function AboutPage() {
  return <>
    <PageIntro title="О компании" label="Подольск / Московская область" description="«Форм-Ресурс М» — слесарная мастерская по ремонту и обслуживанию пресс-форм." image="/images/mold.svg" />
    <section className="section"><div className="wrap split">
      <h2>Слесарная мастерская</h2>
      <div className="paragraph-stack">
        <p className="section-lede">Мастерская работает с пресс-формами, которым требуется обслуживание, восстановление или доводка рабочих поверхностей.</p>
        <p>Чтобы определить подходящую услугу, учитываем назначение оснастки, признаки износа и требования к результату. Возможность и объём конкретных операций обсуждаем по исходным данным.</p>
        <TextLink href="/services/">Посмотреть услуги</TextLink>
      </div>
    </div></section>
    <Process />
    <ContactBand />
  </>;
}
