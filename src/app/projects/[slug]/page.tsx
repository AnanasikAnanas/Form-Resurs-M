import Image from "next/image";
import { notFound } from "next/navigation";
import { Action, Breadcrumbs, Eyebrow } from "@/components/editorial";
import { MediaTrigger } from "@/components/media-trigger";
import { BeforeAfterComparison } from "@/components/before-after-comparison";
import { Reveal } from "@/components/reveal";
import { projects, type ProjectPhoto } from "@/content/projects";
import { pageMeta } from "@/content/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.filter(project => project.status === "published" && project.caseStudy).map(project => ({ slug: project.id }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const project = projects.find(entry => entry.id === slug && entry.status === "published" && entry.caseStudy);
  if (!project) notFound();
  return pageMeta(project.title, project.caseStudy!.subtitle, `/projects/${slug}/`);
}

function ProjectImage({ photo, slides, priority = false }: { photo: ProjectPhoto; slides: ProjectPhoto[]; priority?: boolean }) {
  return <figure className="case-photo">
    <MediaTrigger src={photo.src} slides={slides}>
      <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 38vw" preload={priority} />
    </MediaTrigger>
    <figcaption>{photo.caption}</figcaption>
  </figure>;
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = projects.find(entry => entry.id === slug && entry.status === "published" && entry.caseStudy);
  if (!project?.caseStudy) notFound();
  const study = project.caseStudy;
  const photos = [...study.beforePhotos, ...study.afterPhotos];
  const comparison = study.comparison;
  const before = comparison?.before;
  const after = comparison && study.afterPhotos[comparison.afterIndex];

  return <>
    <section className="dark page-intro case-hero"><div className="wrap">
      <Breadcrumbs parent={{ href: "/projects/", label: "Наши работы" }} current={study.formNumber} />
      <div className="case-hero-grid">
        <div className="case-hero-copy"><Eyebrow>{study.formNumber}</Eyebrow><h1>{study.formNumber}</h1><p className="case-product">{study.product}</p><p className="lede">{study.subtitle}</p></div>
        <ProjectImage photo={study.afterPhotos[0]} slides={photos} priority />
      </div>
    </div></section>

    <section className="section"><div className="wrap split case-about">
      <Reveal><Eyebrow>Проект</Eyebrow><h2>О проекте</h2><div className="paragraph-stack">{study.description.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></Reveal>
      <Reveal as="div"><dl className="project-details case-facts">
        <div><dt>Номер формы</dt><dd>{study.formNumber}</dd></div>
        <div><dt>Наименование продукции</dt><dd>{study.product}</dd></div>
        <div><dt>Выполненные работы</dt><dd>{project.work}</dd></div>
      </dl></Reveal>
    </div></section>

    {before && after && <section className="section case-media-section" aria-labelledby="case-comparison-title">
      <div className="wrap case-comparison">
        <div className="case-media-heading">
          <h2 id="case-comparison-title">До и после ремонта</h2>
          <p>{comparison?.caption}</p>
        </div>
        <BeforeAfterComparison before={before} after={after} width={after.width} height={after.height} label="Переместите ползунок для сравнения состояния копира" />
      </div>
    </section>}

    <section className="section case-media-section"><div className="wrap">
      <Reveal className="case-media-heading"><Eyebrow>01 / Исходное состояние</Eyebrow><h2>До ремонта</h2><p>{study.beforeCaption}</p></Reveal>
      <div className="case-before-grid">{study.beforePhotos.map(photo => <Reveal as="div" type="fade" key={photo.src}><ProjectImage photo={photo} slides={photos} /></Reveal>)}</div>
    </div></section>

    <section className="section"><div className="wrap">
      <Reveal className="case-media-heading"><Eyebrow>02 / Выполненные работы</Eyebrow><h2>После ремонта</h2><p>{study.afterCaption}</p></Reveal>
      <div className="case-after-grid">{study.afterPhotos.map(photo => <Reveal as="div" type="fade" key={photo.src}><ProjectImage photo={photo} slides={photos} /></Reveal>)}</div>
    </div></section>

    <section className="section process-section"><div className="wrap split">
      <Reveal><Eyebrow>ФРМ 560</Eyebrow><h2>Выполненные операции</h2></Reveal>
      <ol className="rule-list numbered">{study.operations.map(operation => <li key={operation}>{operation}</li>)}</ol>
    </div></section>
    <section className="contact-band"><Reveal className="wrap contact-band-inner"><div><Eyebrow>Обсудить задачу</Eyebrow><h2>Нужен ремонт пресс-формы?</h2><p>Расскажите о похожей задаче и приложите фотографии оснастки к заявке.</p></div><Action href="/contacts/#inquiry" variant="outline">Оставить заявку</Action></Reveal></section>
  </>;
}
