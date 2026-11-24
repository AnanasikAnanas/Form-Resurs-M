"use client";

import { lockScroll } from "@/lib/scroll-lock";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const path = usePathname();
  return <HeaderMenu key={path} />;
}

function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const menu = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 700px)");
    let unlock: (() => void) | undefined;
    const background = Array.from(document.querySelectorAll<HTMLElement>("main, .site-footer"));
    const previousInert = background.map(element => element.inert);
    function syncMenu() {
      if (menu.current) menu.current.inert = mobile.matches && !open;
      unlock?.();
      unlock = open && mobile.matches ? lockScroll() : undefined;
      background.forEach((element, index) => { element.inert = previousInert[index] || (open && mobile.matches); });
    }
    syncMenu();
    if (open && mobile.matches) menu.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    mobile.addEventListener("change", syncMenu);
    return () => { unlock?.(); background.forEach((element, index) => { element.inert = previousInert[index]; }); mobile.removeEventListener("change", syncMenu); };
  }, [open]);

  return (
    <header className="site-header" onKeyDown={(event) => {
      if (event.key === "Tab" && open && window.matchMedia("(max-width: 700px)").matches) {
        const links = Array.from(menu.current?.querySelectorAll<HTMLAnchorElement>("a") || []);
        const first = toggle.current;
        const last = links.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
      <div className="wrap header-inner">
        <Brand onClick={() => setOpen(false)} />
        <button ref={toggle} className="menu-toggle" type="button" aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-controls="site-nav" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
        <nav ref={menu} id="site-nav" aria-label="Основная навигация" className={open ? "navigation is-open" : "navigation"}>
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
