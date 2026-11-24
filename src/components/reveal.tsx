"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { motion, useAnimationControls, useInView, useReducedMotion, type Variants } from "motion/react";

const elements = { div: motion.div, section: motion.section, figure: motion.figure, li: motion.li, article: motion.article, h2: motion.h2 };
type RevealType = "up" | "fade" | "side";
type Props = { children: ReactNode; className?: string; as?: keyof typeof elements; type?: RevealType; delay?: number; duration?: number; amount?: number; id?: string };
const staggerContext = createContext(.08);
const ease = [.22, 1, .36, 1] as const;

export function Reveal({ children, className = "", as = "div", type = "up", delay = 0, duration = .62, amount = .2, id }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const eligible = useRef(false);
  const played = useRef(false);
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const visible = useInView(ref, { once: true, amount, margin: "0px 0px 160px 0px" });
  const Element = elements[as];
  const variants: Variants = {
    reveal: { opacity: [0, 1], y: type === "up" ? [20, 0] : [0, 0], x: type === "side" ? [16, 0] : [0, 0], transition: { duration, delay: Math.min(delay, .32), ease, type: "tween" } },
  };
  useEffect(() => {
    eligible.current = Boolean(ref.current && ref.current.getBoundingClientRect().top >= window.innerHeight);
  }, []);
  useEffect(() => {
    if (reduced) {
      controls.stop();
      controls.set({ opacity: 1, x: 0, y: 0 });
      played.current = true;
      return;
    }
    if (!visible || played.current || !eligible.current) return;
    played.current = true;
    if (ref.current?.contains(document.activeElement)) return;
    controls.start("reveal").catch(() => controls.set({ opacity: 1, x: 0, y: 0 }));
  }, [visible, reduced, controls]);
  useEffect(() => () => { controls.stop(); }, [controls]);
  return <Element ref={(element: HTMLElement | null) => { ref.current = element; }} id={id} className={`reveal ${className}`} initial={false} animate={controls} variants={variants} onFocusCapture={() => {
    played.current = true;
    controls.stop();
    controls.set({ opacity: 1, x: 0, y: 0 });
  }}>{children}</Element>;
}

export function RevealGroup({ children, className, as: Element = "div", stagger = .08 }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol"; stagger?: number }) {
  return <staggerContext.Provider value={Math.min(.1, Math.max(.06, stagger))}><Element className={className}>{children}</Element></staggerContext.Provider>;
}

export function RevealItem({ index, ...props }: Props & { index: number }) {
  const stagger = useContext(staggerContext);
  return <Reveal {...props} delay={Math.min(index, 4) * stagger} />;
}
