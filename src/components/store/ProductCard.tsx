import Link from "next/link";
import { Media } from "../Media";
import { Stars } from "./Stars";
import { formatPHP } from "@/lib/money";
import type { ProductCardData } from "@/lib/catalog";
import { QuickView } from "./QuickView";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({ p, wished = false }: { p: ProductCardData; wished?: boolean }) {
  return (
    <article className="group card-hover relative">
      <div className="relative aspect-[4/5] overflow-hidden bg-ivory">
        <Link href={`/products/${p.slug}`} aria-label={p.name} className="absolute inset-0">
          <Media src={p.image} alt={p.name} sizes="(min-width: 1024px) 25vw, 50vw" />
          {p.hoverImage && (
            <span className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
              <Media src={p.hoverImage} alt="" sizes="(min-width: 1024px) 25vw, 50vw" />
            </span>
          )}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {p.isPlaceholder && <span className="badge bg-pearl/90 text-champagne-deep">Sample</span>}
          {p.soldOut && <span className="badge bg-charcoal text-pearl">Sold out</span>}
          {p.compareAt && !p.soldOut && <span className="badge bg-pearl/90">Sale</span>}
        </div>
        <div className="absolute right-3 top-3">
          <WishlistButton productId={p.id} wished={wished} />
        </div>
        <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 max-lg:hidden">
          <QuickView p={p} />
        </div>
      </div>
      <div className="mt-5 space-y-1.5 text-center">
        {p.family && <p className="eyebrow !text-[10px]">{p.family}</p>}
        <h3 className="font-serif text-[22px] leading-tight">
          <Link href={`/products/${p.slug}`}>{p.name}</Link>
        </h3>
        <p className="text-[14px]">
          {p.variants.length > 1 && <span className="text-muted">From </span>}
          {formatPHP(p.minPrice)}
          {p.compareAt && <s className="ml-2 text-muted">{formatPHP(p.compareAt)}</s>}
        </p>
        {p.variants.length > 1 && <p className="text-[12px] text-muted">{p.variants.map((v) => v.name).join(" · ")}</p>}
        {p.rating && (
          <p className="flex items-center justify-center gap-2 text-[12px] text-muted">
            <Stars value={p.rating.average} /> ({p.rating.count})
          </p>
        )}
        <div className="pt-2 lg:hidden">
          <QuickView p={p} />
        </div>
      </div>
    </article>
  );
}
