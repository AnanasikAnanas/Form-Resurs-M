import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { workshopPhotos } from "@/content/workshop";
import { notFound } from "next/navigation";
import { ContactBand, PageIntro, ProjectList, TextLink } from "@/components/editorial";
import { visibleProjects } from "@/content/projects";
import { pageMeta } from "@/content/seo";
import { services, serviceUrl } from "@/content/services";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return services.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const service = services.find((entry) => entry.slug === slug);
  if (!service) notFound();
  return pageMeta(`${service.title} в Подольске`, service.summary, serviceUrl(slug));
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = services.find((entry) => entry.slug === slug);
  if (!service) notFound();
  const related = visibleProjects.filter(({ serviceSlug }) => serviceSlug === slug);

  return <>
    <PageIntro title={service.title} description={service.summary} label={`Направление ${service.number}`} current={service.shortTitle} image={service.image} photo={slug === "mold-maintenance" ? workshopPhotos.maintenance : undefined} parent={{ href: "/services/", label: "Услуги" }} />
    <section className="section"><div className="wrap detail-grid">
      <Reveal><h2>Особенности</h2><p className="section-lede">{service.features}</p></Reveal>
      <div><Reveal as="h2">Типичные задачи</Reveal><RevealGroup as="ul" className="rule-list">{service.tasks.map((task, index) => <RevealItem as="li" index={index} key={task}>{task}</RevealItem>)}</RevealGroup></div>
    </div></section>
    <section className="section process-section"><div className="wrap split">
      <Reveal as="h2">Возможный порядок работ</Reveal>
      <RevealGroup as="ol" className="rule-list numbered">{service.process.map((step, index) => <RevealItem as="li" index={index} key={step}>{step}</RevealItem>)}</RevealGroup>
    </div></section>
    {related.length > 0 && <section className="section"><div className="wrap">
      <Reveal className="section-heading"><h2>Материалы по услуге</h2><TextLink href="/projects/">К портфолио</TextLink></Reveal>
      <ProjectList projects={related} compact />
    </div></section>}
    <ContactBand service={slug} />
  </>;
}
