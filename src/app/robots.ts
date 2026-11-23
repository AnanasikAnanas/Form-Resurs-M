import type { MetadataRoute } from "next";
import { indexable, siteUrl } from "@/content/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: indexable
      ? { userAgent: "*", allow: "/" }
      : { userAgent: "*", disallow: "/" },
    sitemap: indexable && siteUrl ? new URL("/sitemap.xml", siteUrl).href : undefined,
  };
}
