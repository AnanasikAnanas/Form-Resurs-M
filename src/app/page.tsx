import Image from "next/image";
import { Action, ContactBand, Eyebrow, Process, ProjectList, ServiceList, TextLink } from "@/components/editorial";
import { visibleProjects } from "@/content/projects";
import { pageMeta } from "@/content/seo";
import { site } from "@/content/site";

export const metadata = pageMeta("Ремонт и обслуживание пресс-форм в Подольске", "Слесарная мастерская в Подольске. Ремонт и обслуживание пресс-форм, лазерная наплавка и полировка формообразующих поверхностей.", "/");

const tasks = [
  ["Износ рабочих поверхностей", "Оценка состояния кромок, вставок и сопряжений перед восстановлением."],
  ["Нарушение работы оснастки", "Осмотр подвижных узлов и участков смыкания для уточнения причин."],
  ["Локальные повреждения металла", "Оценка возможности наплавки с учётом материала и расположения дефекта."],
  ["Следы на формообразующей поверхности", "Доводка рабочей зоны с учётом требований к фактуре изделия."],
];

export default function Home() {
  return <>
    <section className="hero dark">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <Eyebrow>{site.city} / {site.region}</Eyebrow>
          <h1>Восстанавливаем<br className="hero-break" /> ресурс<br className="hero-break" /> производства</h1>
          <p className="lede">Ремонт, обслуживание и восстановление пресс-форм. Лазерная наплавка и полировка формообразующих поверхностей.</p>
          <div className="hero-actions"><Action href="/services/">Наши услуги</Action><Action href="/contacts/#inquiry" variant="outline">Обсудить задачу</Action></div>
        </div>
        <figure className="hero-art">
          <Image src="/images/mold.svg" alt="" width={800} height={690} preload />
          <figcaption><span>Пресс-форма</span><span>Техническая иллюстрация</span></figcaption>
        </figure>
      </div>
    </section>
    <section className="section workshop">
      <div className="wrap split">
        <div><Eyebrow>Специализация</Eyebrow><h2>Слесарная<br />мастерская</h2></div>
        <div className="paragraph-stack">
          <p className="section-lede">Работаем с оснасткой, которая уже используется в производстве.</p>
          <p>Ремонтируем и обслуживаем пресс-формы, выполняем лазерную наплавку и полировку формообразующих поверхностей. Подход к ремонту определяем по состоянию и назначению оснастки.</p>
          <TextLink href="/about/">О компании</TextLink>
        </div>
      </div>
    </section>
    <section className="section services-section">
      <div className="wrap">
        <div className="section-heading"><h2>Услуги мастерской</h2><TextLink href="/services/">Все услуги</TextLink></div>
        <ServiceList />
      </div>
    </section>
    <section className="section dark">
      <div className="wrap split">
        <div><h2>Производственные задачи</h2><p className="section-caption">Перечень работ согласуем после предварительного рассмотрения оснастки.</p></div>
        <ul className="task-list">{tasks.map(([title, description]) => <li key={title}><h3>{title}</h3><p>{description}</p></li>)}</ul>
      </div>
    </section>
    {visibleProjects.length > 0 && <section className="section">
      <div className="wrap">
        <div className="section-heading"><h2>Наши работы</h2><TextLink href="/projects/">К портфолио</TextLink></div>
        <ProjectList projects={visibleProjects.slice(0, 2)} compact />
      </div>
    </section>}
    <Process />
    <ContactBand />
  </>;
}
