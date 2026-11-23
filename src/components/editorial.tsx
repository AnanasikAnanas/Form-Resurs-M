import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Brand } from "./chrome";
import { site, navigation, collaboration } from "@/content/site";
import { services, serviceUrl } from "@/content/services";
import type { Project } from "@/content/projects";

export function Action({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "outline" }) {
  return <Link href={href} className={`action action-${variant}`}>{children}<ArrowUpRight size={19} aria-hidden="true" /></Link>;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="text-link" href={href}>{children}<ArrowUpRight size={17} aria-hidden="true" /></Link>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow"><span aria-hidden="true" />{children}</p>;
}

export function Breadcrumbs({ parent, current }: { parent?: { label: string; href: string }; current: string }) {
  return <nav aria-label="Хлебные крошки" className="breadcrumbs">
    <Link href="/">Главная</Link>
    {parent && <><span aria-hidden="true">/</span><Link href={parent.href}>{parent.label}</Link></>}
    <span aria-hidden="true">/</span><span aria-current="page">{current}</span>
  </nav>;
}

export function PageIntro({ title, description, parent, current = title, label, image }: {
  title: string; description: string; parent?: { label: string; href: string }; current?: string; label?: string; image?: string;
}) {
  return <section className="dark page-intro">
    <div className="wrap">
      <Breadcrumbs parent={parent} current={current} />
      <div className={image ? "intro-grid" : "intro-copy"}>
        <div>
          {label && <Eyebrow>{label}</Eyebrow>}
          <h1>{title}</h1>
          <p className="lede">{description}</p>
        </div>
        {image && <figure className="intro-image">
          <Image src={image} width={800} height={540} alt="" preload />
          <figcaption>Техническая иллюстрация</figcaption>
        </figure>}
      </div>
    </div>
  </section>;
}

export function ServiceList() {
  return <ul className="service-list">
    {services.map((service) => (
      <li key={service.slug}><Link href={serviceUrl(service.slug)} className="service-row">
        <span className="service-num">{service.number}</span>
        <h3>{service.shortTitle}</h3>
        <p>{service.summary}</p>
        <ArrowUpRight className="row-arrow" size={23} aria-hidden="true" />
      </Link></li>
    ))}
  </ul>;
}

export function Process() {
  return <section className="section process-section">
    <div className="wrap split">
      <div>
        <Eyebrow>Сотрудничество</Eyebrow>
        <h2>Порядок работы</h2>
      </div>
      <ol className="steps">
        {collaboration.map(([title, description], index) => (
          <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{description}</p></div></li>
        ))}
      </ol>
    </div>
  </section>;
}

export function ContactBand({ service }: { service?: string }) {
  return <section className="contact-band">
    <div className="wrap contact-band-inner">
      <div><Eyebrow>{site.city} / {site.region}</Eyebrow><h2>Обсудим вашу задачу</h2>
        <p>Расскажите, с какой оснасткой вы работаете и что нужно восстановить или обслужить.</p></div>
      <Action href={service ? `/contacts/?service=${service}#inquiry` : "/contacts/#inquiry"} variant="outline">Перейти к контактам</Action>
    </div>
  </section>;
}

export function ProjectList({ projects, compact = false }: { projects: Project[]; compact?: boolean }) {
  if (!projects.length) return <p className="muted">Материалы для портфолио подготавливаются.</p>;

  return <div className={compact ? "projects-grid compact" : "projects-grid"}>
    {projects.map((project) => {
      const service = services.find(({ slug }) => slug === project.serviceSlug);
      return <article className="project" key={project.id} id={project.id}>
        <div className="project-visual">
          {project.status === "published" && (project.before || project.after) ? (
            <div className="photo-pair">
              {([[project.before, "До работ"], [project.after, "После работ"]] as const).map(([src, label]) => src && (
                <figure key={label}><Image src={src} width={800} height={540} alt={`${project.title} — ${label.toLowerCase()}`} /><figcaption>{label}</figcaption></figure>
              ))}
            </div>
          ) : (
            <figure className="project-illustration">
              {service && <Image src={service.image} width={800} height={540} alt="" />}
              <figcaption>{project.status === "demo" ? "Иллюстрация примера" : "Фотографии подготавливаются"}</figcaption>
            </figure>
          )}
        </div>
        <div className="project-copy">
          <p className="project-category">{project.status === "demo" && <span>Пример оформления</span>}{service?.shortTitle}</p>
          <h3>{project.title}</h3>
          <p>{project.task}</p>
          {compact ? <TextLink href={`/projects/#${project.id}`}>Материал</TextLink> : (
            <dl className="project-details">
              <div><dt>Выполненные работы</dt><dd>{project.work ?? "Описание работ будет добавлено."}</dd></div>
              <div><dt>Результат</dt><dd>{project.result ?? "Материалы для описания результата будут добавлены."}</dd></div>
            </dl>
          )}
        </div>
      </article>;
    })}
  </div>;
}

export function Footer() {
  return <footer className="site-footer dark">
    <div className="wrap">
      <div className="footer-main">
        <div><Brand /><p>{site.city}, {site.region}</p></div>
        <nav aria-label="Навигация в подвале">{navigation.map(({ href, label }) => <Link key={href} href={href}>{label}</Link>)}</nav>
      </div>
      <div className="footer-bottom">
        <span>© {site.name}</span>
        <Link href="/privacy/">Политика обработки персональных данных</Link>
        <a href="#top">Наверх <ArrowDownRight className="back-arrow" size={15} aria-hidden="true" /></a>
      </div>
    </div>
  </footer>;
}

