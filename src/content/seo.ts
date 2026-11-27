import type { Metadata } from "next";
import { site } from "./site";
import { services, serviceUrl } from "./services";
import { projects } from "./projects";

function configuredUrl() {
  if (!process.env.SITE_URL) return null;
  const url = new URL(process.env.SITE_URL);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SITE_URL должен содержать только origin, например https://form-resurs-m.ru");
  }
  return url;
}

export const siteUrl = configuredUrl();
export const indexable = Boolean(siteUrl && process.env.SITE_INDEXABLE === "true");
export const publicRoutes = ["/", "/services/", "/projects/", "/about/", "/contacts/", ...services.map(({ slug }) => serviceUrl(slug)), ...projects.filter(project => project.status === "published" && project.caseStudy).map(project => `/projects/${project.id}/`)];

export function pageMeta(title: string, description: string, path: string, publicPage = true): Metadata {
  const url = siteUrl ? new URL(path, siteUrl) : undefined;
  return {
    title,
    description,
    alternates: url ? { canonical: url } : undefined,
    robots: { index: indexable && publicPage, follow: indexable && publicPage },
    openGraph: {
      title: `${title} — ${site.name}`,
      description,
      url,
      siteName: site.name,
      locale: "ru_RU",
      type: "website",
      images: siteUrl ? [{ url: new URL("/images/og.png", siteUrl), width: 1200, height: 630, alt: "Форм-Ресурс М" }] : undefined,
    },
  };
}
