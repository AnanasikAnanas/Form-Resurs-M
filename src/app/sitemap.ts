import type { MetadataRoute } from "next";
import { indexable, publicRoutes, siteUrl } from "@/content/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const domain = siteUrl;
  if (!indexable || !domain) return [];
  return publicRoutes.map((path) => ({ url: new URL(path, domain).href }));
}
