import type { Metadata } from "next";
import { Header } from "@/components/chrome";
import { Footer } from "@/components/editorial";
import { siteUrl } from "@/content/seo";
import { site } from "@/content/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl ?? undefined,
  applicationName: site.name,
  robots: { index: false, follow: false },
  title: { default: site.name, template: `%s — ${site.name}` },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru">
    <body id="top">
      <a className="skip-link" href="#main">К содержанию</a>
      <Header />
      <main id="main" tabIndex={-1}>{children}</main>
      <Footer />
    </body>
  </html>;
}
