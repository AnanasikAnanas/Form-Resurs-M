"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function MotionController() {
  const pathname = usePathname();
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;
    function start() {
      observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      animations.clear();
      if (preference.matches || !("IntersectionObserver" in window)) return;
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.target.matches(".steps li")) {
            entry.target.classList.toggle("step-current", entry.isIntersecting);
            if (entry.isIntersecting) entry.target.classList.add("step-entered");
            return;
          }
          if (!entry.isIntersecting) return;
          observer?.unobserve(entry.target);
          if (entry.target.contains(document.activeElement)) return;
          const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--motion-reveal")) || 440;
          const animation = entry.target.animate([
            { opacity: 0, transform: "translateY(16px)" },
            { opacity: 1, transform: "translateY(0)" },
          ], { duration, easing: "cubic-bezier(.22, 1, .36, 1)" });
          animations.add(animation);
          animation.finished.finally(() => animations.delete(animation)).catch(() => {});
        });
      }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
      document.querySelectorAll("main .section, .contact-band, .steps li").forEach(element => {
        if (element.matches(".steps li") || element.getBoundingClientRect().top >= window.innerHeight) observer?.observe(element);
      });
    }
    start();
    preference.addEventListener("change", start);
    return () => {
      observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      preference.removeEventListener("change", start);
    };
  }, [pathname]);
  return null;
}
