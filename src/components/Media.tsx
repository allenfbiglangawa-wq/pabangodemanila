import Image from "next/image";

/**
 * Image wrapper: raster images go through next/image (resized, lazy, modern
 * formats); SVG placeholders are served as-is. Pictures are shown whole (contain), never cropped.
 */
export function Media({
  src,
  alt,
  className,
  sizes = "100vw",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const url = src || "/placeholders/bottle-1.svg";
  if (url.endsWith(".svg")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={`h-full w-full object-contain ${className ?? ""}`} loading={priority ? "eager" : "lazy"} />;
  }
  return <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className={`object-contain ${className ?? ""}`} />;
}
