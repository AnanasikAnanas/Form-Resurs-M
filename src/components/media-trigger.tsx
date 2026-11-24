"use client";

import dynamic from "next/dynamic";
import { useRef, useState, type ReactNode } from "react";
import type { MediaSlide } from "./media-viewer";

const MediaViewer = dynamic(() => import("./media-viewer"), { ssr: false });

export function MediaTrigger({ slides, src, children }: { slides: MediaSlide[]; src: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const initial = Math.max(0, slides.findIndex(slide => slide.src === src));
  return <>
    <button ref={trigger} className="media-trigger photo-viewport" type="button" aria-haspopup="dialog" aria-label={`Открыть фотографию: ${slides[initial]?.caption}`} onClick={() => setOpen(true)}>{children}<span className="media-hint" aria-hidden="true">Увеличить ↗</span></button>
    {open && <MediaViewer slides={slides} initial={initial} onClose={() => { setOpen(false); trigger.current?.focus(); }} />}
  </>;
}
