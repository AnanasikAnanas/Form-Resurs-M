import { ContactBand, PageIntro, ServiceList } from "@/components/editorial";
import { pageMeta } from "@/content/seo";

const description = "Четыре направления слесарной мастерской для ремонта, обслуживания и восстановления пресс-форм.";
export const metadata = pageMeta("Услуги слесарной мастерской", description, "/services/");

export default function ServicesPage() {
  return <>
    <PageIntro title="Услуги мастерской" description={description} current="Услуги" />
    <section className="section"><div className="wrap"><h2 className="sr-only">Направления работ</h2><ServiceList /></div></section>
    <ContactBand />
  </>;
}
