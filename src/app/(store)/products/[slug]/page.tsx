import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCards } from "@/lib/catalog";
import { available } from "@/lib/inventory";
import { effectivePrice, formatPHP } from "@/lib/money";
import { getSetting } from "@/lib/settings";
import { formatDate, siteUrl, splitNotes } from "@/lib/utils";
import { MIN_REVIEWS_FOR_AGGREGATE } from "@/lib/constants";
import { reportReview } from "@/app/actions/reviews";
import { Gallery } from "@/components/store/Gallery";
import { AddToCartForm } from "@/components/store/AddToCartForm";
import { WishlistButton } from "@/components/store/WishlistButton";
import { ProductCard } from "@/components/store/ProductCard";
import { ReviewForm } from "@/components/store/ReviewForm";
import { Stars } from "@/components/store/Stars";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      category: true,
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, include: { media: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  return {
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.description.slice(0, 160),
    openGraph: { title: p.name, description: p.description.slice(0, 160), images: p.images[0] ? [p.images[0].url] : undefined },
    alternates: { canonical: `/products/${p.slug}` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await load(slug);
  // The per-scent candle pages were merged into one listing; keep old shared links working.
  if (!p && slug.endsWith("-perfumed-candle")) permanentRedirect("/products/perfumed-candle");
  if (!p) notFound();
  const [user, policies] = await Promise.all([getCurrentUser(), getSetting("policies")]);
  const wished = user ? Boolean(await db.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId: p.id } } })) : false;
  const related = (await getCards({ id: { not: p.id }, categoryId: p.categoryId ?? undefined }, { isFeatured: "desc" }, 4)).slice(0, 4);

  const variants = p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, salePrice: v.salePrice != null && v.salePrice < v.price ? v.salePrice : null, available: available(v) }));
  const prices = p.variants.map(effectivePrice);
  const reviewCount = p.reviews.length;
  const avg = reviewCount ? p.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;
  const showAggregate = reviewCount >= MIN_REVIEWS_FOR_AGGREGATE;
  const notes = [
    ["Top notes", splitNotes(p.topNotes)],
    ["Heart notes", splitNotes(p.heartNotes)],
    ["Base notes", splitNotes(p.baseNotes)],
  ] as const;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((i) => siteUrl(i.url)),
    sku: p.variants[0]?.sku,
    brand: { "@type": "Brand", name: "Pabango de Manila" },
    offers: p.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      priceCurrency: "PHP",
      price: (effectivePrice(v) / 100).toFixed(2),
      availability: available(v) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: siteUrl(`/products/${p.slug}`),
    })),
    ...(showAggregate ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount } } : {}),
  };

  return (
    <div className="container-luxe pt-10 lg:pt-16">
      {/* Placeholder products are excluded from structured data so search engines never index sample items. */}
      {!p.isPlaceholder && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <nav className="mb-8 text-[12px] text-muted" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-charcoal">Shop</Link>
        {p.category && <> / <Link href={`/shop?category=${p.category.slug}`} className="hover:text-charcoal">{p.category.name}</Link></>}
      </nav>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt }))} name={p.name} videoUrl={p.videoUrl} />

        <div className="lg:sticky lg:top-28 lg:self-start">
          {p.isPlaceholder && <p className="mb-5 border border-sand bg-ivory px-4 py-3 text-[12px] text-champagne-deep">Sample product for demonstration. Not a real item.</p>}
          {p.fragranceFamily && <p className="eyebrow">{p.fragranceFamily}</p>}
          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="display text-5xl lg:text-6xl">{p.name}</h1>
            <WishlistButton productId={p.id} wished={wished} back={`/products/${p.slug}`} />
          </div>
          <p className="mt-5 text-xl">
            {prices.length > 1 && Math.min(...prices) !== Math.max(...prices) ? `${formatPHP(Math.min(...prices))} – ${formatPHP(Math.max(...prices))}` : formatPHP(prices[0] ?? 0)}
          </p>
          {showAggregate && (
            <a href="#reviews" className="mt-3 flex items-center gap-2 text-[13px] text-muted">
              <Stars value={avg} /> {avg.toFixed(1)} · {reviewCount} reviews
            </a>
          )}
          <div className="mt-8 space-y-4 text-[15px] leading-[1.85] text-charcoal/80">{p.description.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}</div>

          <div className="mt-10">
            <AddToCartForm variants={variants} showBuyNow />
          </div>

          {notes.some(([, n]) => n.length) && (
            <div className="mt-12 border-t border-line pt-8">
              <h2 className="eyebrow mb-6">Fragrance Notes</h2>
              <dl className="grid grid-cols-3 gap-6">
                {notes.map(([label, list]) => (
                  <div key={label}>
                    <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</dt>
                    <dd className="mt-2 font-serif text-xl leading-snug">{list.length ? list.join(", ") : "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-10 divide-y divide-line border-y border-line text-[14px]">
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none justify-between uppercase tracking-[0.16em] text-[12px]">Details <span className="group-open:rotate-45 transition-transform">+</span></summary>
              <dl className="mt-4 space-y-1 text-muted">
                {p.variants.map((v) => <div key={v.id}><dt className="inline">SKU {v.name}: </dt><dd className="inline">{v.sku}</dd></div>)}
              </dl>
            </details>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none justify-between uppercase tracking-[0.16em] text-[12px]">Shipping & Returns <span className="group-open:rotate-45 transition-transform">+</span></summary>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">
                {p.shippingInfo || "See our Shipping Policy and Return & Refund Policy for details."}
              </p>
              <p className="mt-3 flex gap-5 text-[13px]">
                <Link href="/policies/shipping" className="underline">Shipping Policy</Link>
                <Link href="/policies/returns" className="underline">Returns & Refunds</Link>
              </p>
              {!policies.shipping && <span className="sr-only">Policy pending</span>}
            </details>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="mt-28 grid gap-14 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="display text-4xl">Customer Reviews</h2>
          {showAggregate ? (
            <p className="mt-4 flex items-center gap-3 text-muted"><Stars value={avg} /> {avg.toFixed(1)} out of 5 · {reviewCount} reviews</p>
          ) : (
            <p className="mt-4 text-[14px] text-muted">{reviewCount === 0 ? "No reviews yet." : `${reviewCount} review${reviewCount > 1 ? "s" : ""}.`}</p>
          )}
          <div className="mt-8">
            {user ? (
              <ReviewForm productId={p.id} defaultName={user.name.split(" ")[0]} />
            ) : (
              <Link href={`/account/login?next=/products/${p.slug}%23reviews`} className="btn-outline">Sign in to write a review</Link>
            )}
          </div>
        </div>
        <ul className="divide-y divide-line">
          {p.reviews.map((r) => (
            <li key={r.id} className="py-8 first:pt-0">
              <div className="flex items-center justify-between gap-4">
                <Stars value={r.rating} />
                <span className="text-[12px] text-muted">{formatDate(r.createdAt)}</span>
              </div>
              {r.title && <h3 className="mt-3 font-serif text-2xl">{r.title}</h3>}
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-charcoal/85">{r.body}</p>
              {r.media.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.media.map((m) =>
                    m.type === "IMAGE" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={m.id} src={m.url} alt="Customer photo" className="h-24 w-24 bg-ivory object-contain" loading="lazy" />
                    ) : (
                      <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer nofollow" className="btn-link">Watch video</a>
                    ),
                  )}
                </div>
              )}
              <p className="mt-4 text-[12px] uppercase tracking-[0.16em] text-muted">
                {r.displayName}
                {r.isVerifiedPurchase && <span className="ml-2 text-champagne-deep">· Verified Purchase</span>}
              </p>
              {r.adminResponse && (
                <div className="mt-4 border-l-2 border-champagne bg-ivory p-4 text-[14px]">
                  <p className="eyebrow mb-1">Response from Pabango de Manila</p>
                  <p className="whitespace-pre-line">{r.adminResponse}</p>
                </div>
              )}
              <details className="mt-3 text-[12px] text-muted">
                <summary className="cursor-pointer">Report this review</summary>
                <form action={reportReview} className="mt-2 flex gap-2">
                  <input type="hidden" name="reviewId" value={r.id} />
                  <select name="reason" className="field !py-1.5 !text-[13px]" aria-label="Reason">
                    <option>Inappropriate content</option>
                    <option>Spam or advertising</option>
                    <option>Not about this product</option>
                    <option>Contains personal information</option>
                  </select>
                  <button className="admin-btn-ghost">Report</button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="mt-28">
          <h2 className="display text-center text-4xl">You May Also Like</h2>
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
