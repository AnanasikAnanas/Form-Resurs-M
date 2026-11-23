import { ContactBand, PageIntro, ProjectList } from "@/components/editorial";
import { visibleProjects } from "@/content/projects";
import { pageMeta } from "@/content/seo";

export const metadata = pageMeta("Наши работы", "Портфолио слесарной мастерской. Материалы о ремонте, обслуживании и восстановлении пресс-форм.", "/projects/");

export default function ProjectsPage() {
  const hasDemo = visibleProjects.some(({ status }) => status === "demo");
  return <>
    <PageIntro title="Наши работы" description={hasDemo ? "Записи с пометкой «Пример оформления» показывают структуру кейсов. Они не описывают выполненные заказы." : "Материалы о ремонте, обслуживании и восстановлении пресс-форм."} />
    <section className="section"><div className="wrap"><h2 className="sr-only">Портфолио мастерской</h2><ProjectList projects={visibleProjects} /></div></section>
    <ContactBand />
  </>;
}
