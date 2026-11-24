"use client";

import Image from "next/image";
import { useId, useState } from "react";

type Props = {
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  width: number;
  height: number;
  label: string;
};

export function BeforeAfterComparison({ before, after, width, height, label }: Props) {
  const [position, setPosition] = useState(50);
  const id = useId();
  return <figure className="comparison">
    <div className="comparison-images" style={{ aspectRatio: `${width} / ${height}` }}>
      <Image src={after.src} alt={after.alt} fill sizes="(max-width: 700px) 90vw, 70vw" />
      <div className="comparison-before" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <Image src={before.src} alt={before.alt} fill sizes="(max-width: 700px) 90vw, 70vw" />
      </div>
      <span className="comparison-label comparison-label-before">До</span>
      <span className="comparison-label comparison-label-after">После</span>
      <span className="comparison-divider" style={{ left: `${position}%` }} aria-hidden="true" />
    </div>
    <figcaption><label htmlFor={id}>{label}</label></figcaption>
    <input id={id} type="range" min={0} max={100} value={position} aria-label={`${label}: положение границы сравнения`} aria-valuetext={`До: ${position}%, после: ${100 - position}%`} onChange={event => setPosition(Number(event.target.value))} />
  </figure>;
}
