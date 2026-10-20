import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { EVENT_TYPES, INQUIRY_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Media } from "@/components/Media";
import { InquiryForm } from "@/components/store/InquiryForm";
import Link from "next/link";

export const metadata: Metadata = { title: "Event Scenting", description: "Curated fragrance experiences for weddings, corporate events, launches and celebrations." };
export const dynamic = "force-dynamic";

const split = (line: string) => {
  const [a, ...rest] = line.split("|").map((x) => x.trim());
  return [a, rest.join(" | ")] as const;
};

export default async function EventScentingPage() {
  const s = await getSetting("eventScenting");
  const gallery = s.gallery.map(split).filter(([url]) => url);
  const portfolio = await db.pressEntry.findMany({
    where: { isPublished: true, kind: { in: ["PORTFOLIO", "EVENT"] } },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { eventDate: "desc" },
    take: 6,
  });
  return (
    <>
      <section className="bg-ivory">
        <div className="container-luxe grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-16 lg:py-20">
          <div className="lg:col-span-6">
            <p className="eyebrow mb-5">Event Scenting</p>
            <h1 className="display max-w-xl text-5xl lg:text-7xl">{s.heading}</h1>
            <p className="mt-6 max-w-lg text-[17px] text-charcoal/75">{s.description}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#inquire" className="btn-primary">Inquire About Event Scenting</a>
              {s.priceHeadline && <a href="#rates" className="btn-outline">See Rates & Inclusions</a>}
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden lg:col-span-5 lg:col-start-8">
            <Media src={s.heroImage} alt="Pabango de Manila at an evening event" priority sizes="(min-width:1024px) 40vw, 100vw" />
          </div>
        </div>
      </section>

      <section className="container-luxe grid gap-14 py-24 lg:grid-cols-2 lg:py-32">
        <div>
          <p className="eyebrow mb-5">The Experience</p>
          <div className="prose-luxe">{s.intro.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
        </div>
        <div>
          <p className="eyebrow mb-6">For every occasion</p>
          <ul className="grid grid-cols-2 gap-px bg-line">
            {EVENT_TYPES.filter((t) => t !== "Other").map((t) => <li key={t} className="bg-pearl p-6 font-serif text-2xl">{t}</li>)}
          </ul>
        </div>
      </section>

      {(s.priceHeadline || s.inclusions.length > 0) && (
        <section id="rates" className="scroll-mt-24 bg-ivory py-24 lg:py-32">
          <div className="container-luxe grid gap-16 lg:grid-cols-12">
            {s.priceHeadline && (
              <div className="lg:col-span-5">
                <p className="eyebrow mb-5">Event Scentscaping</p>
                <p className="display text-6xl lg:text-7xl">{s.priceHeadline}</p>
                {s.priceNote && <p className="mt-3 font-serif text-2xl italic text-charcoal/80">{s.priceNote}</p>}
                {s.reservation.length > 0 && (
                  <ul className="mt-10 space-y-4 border-t border-charcoal/15 pt-8 text-[15px] leading-relaxed">
                    {s.reservation.map((r, i) => <li key={i} className="flex gap-3"><span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-champagne-deep" />{r}</li>)}
                  </ul>
                )}
              </div>
            )}
            {s.inclusions.length > 0 && (
              <div className={s.priceHeadline ? "lg:col-span-6 lg:col-start-7" : "lg:col-span-12"}>
                <p className="eyebrow mb-5">Inclusions</p>
                <ul className="divide-y divide-charcoal/10 border-y border-charcoal/10">
                  {s.inclusions.map((item, i) => (
                    <li key={i} className="flex items-baseline gap-5 py-4">
                      <span className="font-serif text-xl text-champagne-deep">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[15px]">{item}</span>
                    </li>
                  ))}
                </ul>
                {s.inclusionsNote && <p className="mt-5 text-[13px] text-muted">{s.inclusionsNote}</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="container-luxe py-24 lg:py-32">
          <h2 className="display text-center text-5xl">Moments We Have Scented</h2>
          <div className={`mt-14 grid grid-cols-2 gap-3 sm:gap-5 ${gallery.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
            {gallery.map(([url, caption], i) => (
              <figure key={i}>
                <div className="relative aspect-[4/5] overflow-hidden bg-ivory"><Media src={url} alt={caption} sizes="(min-width:1024px) 25vw, 50vw" /></div>
                {caption && <figcaption className="mt-3 text-[12px] leading-snug text-muted">{caption}</figcaption>}
              </figure>
            ))}
          </div>
          <div className="mt-12 text-center"><Link href="/press" className="btn-link">See press & events</Link></div>
        </section>
      )}

      {s.whyUs.length > 0 && (
        <section className="bg-charcoal py-24 text-pearl lg:py-32">
          <div className="container-luxe">
            <h2 className="display text-center text-5xl">Why Pabango de Manila</h2>
            <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {s.whyUs.map(split).map(([title, text], i) => (
                <div key={i} className="border-t border-pearl/20 pt-6">
                  <p className="font-serif text-2xl">{title}</p>
                  {text && <p className="mt-3 text-[14px] leading-relaxed text-pearl/75">{text}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-24 lg:py-32">
        <div className="container-luxe">
          <h2 className="display text-center text-5xl">How It Works</h2>
          <ol className="mt-16 grid gap-10 md:grid-cols-4">
            {s.steps.map((step, i) => (
              <li key={i} className="border-t border-charcoal/20 pt-6">
                <span className="font-serif text-4xl text-champagne-deep">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-4 text-[15px] leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {gallery.length === 0 && portfolio.length > 0 && (
        <section className="container-luxe py-24 lg:py-32">
          <h2 className="display text-center text-5xl">Portfolio</h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((p) => (
              <Link key={p.id} href={`/press/${p.slug}`} className="card-hover group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-ivory"><Media src={p.coverImage ?? p.images[0]?.url} alt={p.title} sizes="33vw" /></div>
                <p className="mt-4 font-serif text-2xl">{p.title}</p>
                <p className="text-[13px] text-muted">{formatDate(p.eventDate)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="inquire" className="container-luxe scroll-mt-28 py-24 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <h2 className="display text-center text-5xl">Inquire</h2>
          <p className="mx-auto mt-5 max-w-lg text-center text-muted">Tell us your event date, venue, guest count and the exact venue address, and we will reply with a tailored quotation. Only the fields marked * are required.</p>
          <div className="mt-14"><InquiryForm eventTypes={INQUIRY_TYPES} defaultType="Wedding" /></div>
        </div>
      </section>
    </>
  );
}
