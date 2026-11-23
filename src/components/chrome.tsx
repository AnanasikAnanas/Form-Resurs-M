"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { navigation, site } from "@/content/site";

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link className="brand" href="/" onClick={onClick} aria-label={site.name + " — на главную"}>
      <span className="brand-mark" aria-hidden="true">
        <Image src="/images/logo-fr-r.png" width={455} height={476} alt="" />
      </span>
      <span>ФОРМ-РЕСУРС <b>М</b></span>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  return (
    <header className="site-header" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        document.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
      }
    }}>
      <div className="wrap header-inner">
        <Brand onClick={() => setOpen(false)} />
        <button className="menu-toggle" type="button" aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-controls="site-nav" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
        <nav id="site-nav" aria-label="Основная навигация" className={open ? "navigation is-open" : "navigation"}>
          {navigation.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={path?.replace(/\/$/, "") === href.replace(/\/$/, "") ? "page" : undefined} className={(path?.replace(/\/$/, "") === href.replace(/\/$/, "") || path?.startsWith(href)) ? "active" : undefined} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <Link className="mobile-cta" href="/contacts/#inquiry" onClick={() => setOpen(false)}>Обсудить задачу <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
        <Link className="header-cta" href="/contacts/#inquiry">Обсудить задачу <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </header>
  );
}
