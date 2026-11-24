"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { lockScroll } from "@/lib/scroll-lock";

export type MediaSlide = { src: string; alt: string; caption: string };

export default function MediaViewer({ slides, initial, onClose }: { slides: MediaSlide[]; initial: number; onClose: () => void }) {
  const [index, setIndex] = useState(initial);
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const slide = slides[index];
  const move = (direction: number) => setIndex(current => (current + direction + slides.length) % slides.length);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const unlock = lockScroll();
    return () => { element?.close(); unlock(); };
  }, []);
  return createPortal(<dialog ref={dialog} className="media-viewer" aria-label="Просмотр фотографий" onCancel={onClose} onClose={onClose} onKeyDown={event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
  }}>
    <div className="media-toolbar"><span>{index + 1} / {slides.length}</span><button type="button" autoFocus onClick={onClose} aria-label="Закрыть просмотр">Закрыть ×</button></div>
    <div className="media-stage" onTouchStart={event => { touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }} onTouchCancel={() => { touch.current = null; }} onTouchEnd={event => {
      if (touch.current !== null && event.changedTouches.length === 1) {
        const delta = event.changedTouches[0].clientX - touch.current.x;
        const vertical = event.changedTouches[0].clientY - touch.current.y;
        if (Math.abs(delta) > 60 && Math.abs(delta) > Math.abs(vertical) * 1.2) move(delta > 0 ? -1 : 1);
      }
      touch.current = null;
    }}>
      <Image key={slide.src} src={slide.src} alt={slide.alt} fill sizes="100vw" />
    </div>
    <div className="media-footer"><p role="status" aria-live="polite">{slide.caption}</p>{slides.length > 1 && <div><button type="button" onClick={() => move(-1)} aria-label="Предыдущая фотография">←</button><button type="button" onClick={() => move(1)} aria-label="Следующая фотография">→</button></div>}</div>
  </dialog>, document.body);
}
