import { MediaTrigger } from "./media-trigger";
import Image from "next/image";
import { workshopPhotos } from "@/content/workshop";

export function WorkshopPhoto({ photo, className = "", sizes = "(max-width: 680px) 90vw, 40vw" }: { photo: keyof typeof workshopPhotos; className?: string; sizes?: string }) {
  const image = workshopPhotos[photo];
  return <figure className={`workshop-photo ${className}`}>
    <MediaTrigger slides={Object.values(workshopPhotos)} src={image.src}><Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes={sizes} /></MediaTrigger>
    <figcaption>{image.caption}</figcaption>
  </figure>;
}
