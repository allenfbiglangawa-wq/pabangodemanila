import Link from "next/link";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getCards } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPES, PRESS_KINDS } from "@/lib/constants";
import { Media } from "@/components/Media";
import { ArrowIcon, PlayIcon } from "@/components/Icons";
import { HeroMedia } from "@/components/store/HeroMedia";
import { ProductCard } from "@/components/store/ProductCard";
import { SectionHeading } from "@/components/store/SectionHeading";
import { NewsletterForm } from "@/components/store/NewsletterForm";
import { Stars } from "@/components/store/Stars";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [hero, story, eventSettings, instagram, newsletter, user, stockists, business, externalReviews, spotlight, moments] = await Promise.all([
    getSetting("hero"),
    getSetting("story"),
    getSetting("eventScenting"),
    getSetting("instagram"),
    getSetting("newsletter"),
    getCurrentUser(),
    getSetting("stockists"),
    getSetting("business"),
    getSetting("externalReviews"),
    getSetting("spotlight"),
    getSetting("moments"),
  ]);
  const [categories, signature, tvFeature, events, testimonials, wishlist, featuredIn] = await Promise.all([
    db.category.findMany({ where: { isActive: true, products: { some: { status: "ACTIVE" } } }, orderBy: { sortOrder: "asc" }, take: 4 }),
    getCards({ OR: [{ isFeatured: true }, { isBestseller: true }] }, { updatedAt: "desc" }, 8),
    db.pressEntry.findFirst({ where: { isPublished: true, featureOnHome: true, kind: { in: ["TV", "INTERVIEW"] } }, orderBy: { eventDate: "desc" } }),
    db.pressEntry.findMany({
      where: { isPublished: true, featureOnHome: true, kind: { in: ["EVENT", "COLLABORATION", "PORTFOLIO"] } },
      orderBy: { eventDate: "desc" },
      take: 3,
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
    }),
    db.review.findMany({
      where: { status: "APPROVED", showOnHomepage: true },
      include: { product: { select: { name: true, slug: true } }, media: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    user ? db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } }) : [],
    db.pressEntry.findMany({ where: { isPublished: true, kind: { in: ["TV", "INTERVIEW"] } }, orderBy: [{ sortOrder: "asc" }, { eventDate: "desc" }], select: { slug: true, title: true, programName: true, kind: true, eventDate: true } }),
  ]);
  const wished = new Set(wishlist.map((w) => w.productId));
  const outsideReviews = externalReviews.items
    .map((line) => line.split("|").map((x) => x.trim()))
    .filter((parts) => parts.length >= 4 && parts[3])
    .map(([name, source, product, ...quote]) => ({ name, source, product, quote: quote.join(" | ") }));
  const pair = (line: string) => { const [url, ...rest] = line.split("|").map((x) => x.trim()); return [url, rest.join(" | ")] as const; };
  const spotImg = pair(spotlight.image);
  const spotImg2 = pair(spotlight.secondaryImage);
  const momentsFeatured = pair(moments.featured);
  const momentsGallery = moments.gallery.map(pair).filter(([url]) => url);
  const reviewCount = testimonials.length + outsideReviews.length;

  return (
    <>
      {/* Cinematic hero */}
      <section className="relative -mt-px flex min-h-[78vh] items-end overflow-hidden bg-ivory lg:min-h-[88vh]" aria-label="Introduction">
        <HeroMedia videoUrl={hero.videoUrl} poster={hero.posterImage} />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/45 to-charcoal/10 lg:bg-gradient-to-r lg:to-transparent lg:from-charcoal/70 lg:via-charcoal/35" />
        <div className="container-luxe relative pb-20 lg:pb-28">
          <div className="max-w-2xl animate-fade-up text-pearl [text-shadow:0_1px_24px_rgba(0,0,0,0.18)]">
            {hero.tagline && <p className="eyebrow mb-5 !text-pearl/85">{hero.tagline}</p>}
            <h1 className="display text-5xl sm:text-6xl lg:text-[88px]">{hero.headline}</h1>
            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-pearl/90 sm:text-[18px]">{hero.subheadline}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href={hero.primaryHref} className="btn bg-pearl text-charcoal hover:bg-ivory">{hero.primaryLabel}</Link>
              <Link href={hero.secondaryHref} className="btn-light">{hero.secondaryLabel}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      {categories.length > 0 && (
        <section className="container-luxe py-24 lg:py-32">
          <SectionHeading eyebrow="Collections" title="Discover Our Collections" />
          <div className="mt-16 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {categories.map((c) => (
              <Link key={c.id} href={`/shop?category=${c.slug}`} className="group card-hover block">
                <div className="relative aspect-[3/4] overflow-hidden bg-ivory">
                  <Media src={c.imageUrl} alt={c.name} sizes="(min-width:1024px) 25vw, 50vw" />
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <h3 className="font-serif text-2xl">{c.name}</h3>
                  <ArrowIcon className="h-4 w-4 -translate-x-2 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Signature scents */}
      {signature.length > 0 && (
        <section className="bg-ivory py-24 lg:py-32">
          <div className="container-luxe">
            <SectionHeading eyebrow="Signature" title="Our Signature Scents" />
            <div className="mt-16 grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-x-6 lg:grid-cols-4">
              {signature.slice(0, 4).map((p) => (
                <ProductCard key={p.id} p={p} wished={wished.has(p.id)} />
              ))}
            </div>
            <div className="mt-16 text-center">
              <Link href="/shop" className="btn-outline">Shop All</Link>
            </div>
          </div>
        </section>
      )}

      {/* Brand story */}
      <section className="container-luxe grid items-center gap-12 py-24 lg:grid-cols-2 lg:gap-24 lg:py-32">
        <div className="relative aspect-[4/5] overflow-hidden bg-ivory">
          <Media src={story.image} alt="Pabango de Manila" sizes="(min-width:1024px) 50vw, 100vw" />
        </div>
        <div>
          <p className="eyebrow mb-5">The Art of Scent</p>
          <h2 className="display text-5xl lg:text-6xl">{story.heading}</h2>
          <div className="prose-luxe mt-8">
            {story.body.split(/\n\n+/).slice(0, 2).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          <Link href="/our-story" className="btn-link mt-10">Discover Our Story <ArrowIcon /></Link>
        </div>
      </section>

      {/* In the Spotlight: TV & media (verified, published features only; no broadcast captures) */}
      <section className="bg-ivory py-24 lg:py-32" aria-labelledby="spotlight-heading">
        <div className="container-luxe grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="relative lg:col-span-7">
            <figure className="relative aspect-[4/5] w-full overflow-hidden sm:w-[72%] lg:w-[75%]">
              <Media src={spotImg[0]} alt={spotImg[1]} sizes="(min-width:1024px) 45vw, 100vw" className="object-top transition-transform duration-700 hover:scale-[1.02]" />
            </figure>
            {spotImg2[0] && (
              <figure className="absolute -bottom-10 right-0 hidden w-[40%] border-[6px] border-ivory shadow-sm sm:block lg:-right-8">
                <div className="relative aspect-[4/5]"><Media src={spotImg2[0]} alt={spotImg2[1]} sizes="20vw" /></div>
              </figure>
            )}
          </div>
          <div className="lg:col-span-5">
            <p className="eyebrow mb-5">{spotlight.eyebrow}</p>
            <h2 id="spotlight-heading" className="display text-5xl lg:text-6xl">{spotlight.heading}</h2>
            <p className="mt-7 text-[16px] leading-relaxed text-charcoal/75">{spotlight.intro}</p>
            {featuredIn.length > 0 && (
              <ul className="mt-10 divide-y divide-charcoal/10 border-y border-charcoal/10">
                {featuredIn.map((f) => (
                  <li key={f.slug}>
                    <Link href={`/press/${f.slug}`} className="group flex items-baseline justify-between gap-6 py-4">
                      <span>
                        <span className="block font-serif text-2xl group-hover:text-champagne-deep">{f.programName || f.title}</span>
                        <span className="text-[12px] uppercase tracking-[0.18em] text-muted">{[PRESS_KINDS[f.kind as keyof typeof PRESS_KINDS], formatDate(f.eventDate, { dateStyle: "long" })].filter(Boolean).join(" · ")}</span>
                      </span>
                      <ArrowIcon className="h-4 w-4 shrink-0 text-champagne-deep transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-10 flex flex-wrap gap-4">
              {spotlight.videoUrl && (
                <a href={spotlight.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-primary"><PlayIcon className="h-4 w-4" /> Watch Our Story</a>
              )}
              <Link href="/press" className="btn-outline">Press & Media</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Moments & Milestones: event photos with verified captions only */}
      {momentsFeatured[0] && (
        <section className="container-luxe py-24 lg:py-32" aria-labelledby="moments-heading">
          <div className="text-center">
            <p className="eyebrow mb-4">{moments.eyebrow}</p>
            <h2 id="moments-heading" className="display mx-auto max-w-2xl text-5xl lg:text-6xl">{moments.heading}</h2>
          </div>
          <div className="mt-16 grid gap-5 lg:grid-cols-12">
            <figure className="lg:col-span-4">
              <div className="relative aspect-[4/5] overflow-hidden bg-ivory">
                <Media src={momentsFeatured[0]} alt={momentsFeatured[1]} sizes="(min-width:1024px) 33vw, 100vw" className="object-top transition-transform duration-700 hover:scale-[1.02]" />
              </div>
              {momentsFeatured[1] && <figcaption className="mt-3 text-[13px] text-muted">{momentsFeatured[1]}</figcaption>}
            </figure>
            <div className="grid grid-cols-2 content-start gap-5 lg:col-span-8">
              {momentsGallery.map(([url, caption], i) => (
                <figure key={i}>
                  <div className="relative aspect-[4/5] overflow-hidden bg-ivory">
                    <Media src={url} alt={caption} sizes="(min-width:1024px) 33vw, 50vw" className="object-top transition-transform duration-700 hover:scale-[1.03]" />
                  </div>
                  {caption && <figcaption className="mt-2 text-[12px] leading-snug text-muted">{caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
          <div className="mt-12 text-center"><Link href="/press" className="btn-link">See all press & events</Link></div>
        </section>
      )}

      {/* Testimonials (genuine, approved reviews, plus genuine feedback from other channels labelled with its source) */}
      {reviewCount > 0 && (
        <section className="container-luxe py-24 lg:py-32">
          <SectionHeading eyebrow="Reviews" title="Words From Our Customers" />
          <div className={`mt-16 grid gap-12 ${reviewCount === 1 ? "mx-auto max-w-2xl" : reviewCount === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {outsideReviews.map((r, i) => (
              <figure key={`x${i}`} className="text-center">
                <blockquote className=" font-serif text-2xl italic leading-snug lg:text-3xl">“{r.quote}”</blockquote>
                <figcaption className="mt-6 text-[12px] uppercase tracking-[0.2em] text-muted">
                  {r.name}
                  <span className="ml-2 text-champagne-deep">· via {r.source}</span>
                  {r.product && <span className="mt-1 block normal-case tracking-normal">on our {r.product}</span>}
                </figcaption>
              </figure>
            ))}
            {testimonials.map((r) => (
              <figure key={r.id} className="text-center">
                <Stars value={r.rating} />
                <blockquote className="mt-5 font-serif text-2xl italic leading-snug">“{r.body}”</blockquote>
                <figcaption className="mt-6 text-[12px] uppercase tracking-[0.2em] text-muted">
                  {r.displayName}
                  {r.isVerifiedPurchase && <span className="ml-2 text-champagne-deep">· Verified Purchase</span>}
                  <span className="mt-1 block normal-case tracking-normal">
                    on <Link href={`/products/${r.product.slug}`} className="underline">{r.product.name}</Link>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Event booking */}
      <section className="relative overflow-hidden bg-ivory">
        <div className="container-luxe grid gap-12 py-24 lg:grid-cols-2 lg:items-center lg:py-32">
          <div>
            <p className="eyebrow mb-5">Event Scenting</p>
            <h2 className="display text-5xl lg:text-6xl">{eventSettings.heading}</h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-muted">{eventSettings.description}</p>
            {eventSettings.priceHeadline && <p className="mt-6 font-serif text-2xl italic">{eventSettings.priceHeadline} <span className="text-[15px] not-italic text-muted">{eventSettings.priceNote.toLowerCase()}</span></p>}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/event-scenting#inquire" className="btn-primary">Book Event Scenting</Link>
              <Link href="/event-scenting#rates" className="btn-outline">Rates & Inclusions</Link>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-px bg-line">
            {EVENT_TYPES.filter((t) => t !== "Other").map((t) => (
              <li key={t} className="bg-ivory p-6 font-serif text-2xl sm:p-8">{t === "Wedding" ? "Weddings" : t.endsWith("s") ? t : `${t}s`}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* For business */}
      <section className="container-luxe grid gap-12 py-24 lg:grid-cols-12 lg:py-32">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-5">Private Label & B2B</p>
          <h2 className="display text-5xl">{business.heading}</h2>
          <p className="mt-6 text-[16px] leading-relaxed text-muted">{business.intro}</p>
          <Link href="/private-label" className="btn-outline mt-10">Work With Us</Link>
        </div>
        <ul className="divide-y divide-line border-y border-line lg:col-span-6 lg:col-start-7">
          {business.services.map((line) => {
            const [title, text] = line.split("|").map((x) => x.trim());
            return (
              <li key={title} className="py-5">
                <p className="font-serif text-2xl">{title}</p>
                {text && <p className="mt-1 text-[14px] text-muted">{text}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Stockists */}
      {stockists.locations.length > 0 && (
        <section className="border-y border-line bg-pearl py-16">
          <div className="container-luxe text-center">
            <p className="eyebrow mb-4">{stockists.heading}</p>
            <p className="mx-auto max-w-xl text-[15px] text-muted">{stockists.body}</p>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-3 font-serif text-2xl">
              {stockists.locations.map((l) => <li key={l}>{l}</li>)}
            </ul>
            {(stockists.shopeeUrl || stockists.tiktokUrl) && (
              <div className="mt-8 flex justify-center gap-8">
                {stockists.shopeeUrl && <a href={stockists.shopeeUrl} target="_blank" rel="noopener noreferrer" className="btn-link">Also on Shopee</a>}
                {stockists.tiktokUrl && <a href={stockists.tiktokUrl} target="_blank" rel="noopener noreferrer" className="btn-link">TikTok Shop</a>}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Instagram */}
      <section className="container-luxe py-24 lg:py-32">
        <SectionHeading eyebrow="@pabangodemanila" title="Follow Our Fragrance Journey" />
        {instagram.images.length > 0 && (
          <div className="mt-14 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
            {instagram.images.slice(0, 6).map((img, i) => (
              <a key={i} href={img.link || instagram.profileUrl} target="_blank" rel="noopener noreferrer" className="card-hover relative block aspect-square overflow-hidden bg-ivory">
                <Media src={img.url} alt={img.alt} sizes="(min-width:1024px) 16vw, 33vw" />
              </a>
            ))}
          </div>
        )}
        <div className="mt-12 text-center">
          <a href={instagram.profileUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">Follow on Instagram</a>
        </div>
      </section>

      {/* Newsletter */}
      <section className="-mb-32 bg-charcoal text-pearl">
        <div className="container-luxe grid gap-10 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <h2 className="display text-5xl">{newsletter.heading}</h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-pearl/70">{newsletter.body}</p>
          </div>
          <NewsletterForm consentText={newsletter.consentText} source="homepage" dark />
        </div>
      </section>
    </>
  );
}
