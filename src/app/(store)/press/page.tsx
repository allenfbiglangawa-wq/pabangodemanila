import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { PRESS_KINDS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Media } from "@/components/Media";
import { PageHero, Pending } from "@/components/store/PageHero";

export const metadata: Metadata = { title: "Press & Media" };
export const dynamic = "force-dynamic";

export default async function PressPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const entries = await db.pressEntry.findMany({
    where: { isPublished: true, ...(kind && kind in PRESS_KINDS ? { kind } : {}) },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { eventDate: "desc" }],
  });
  return (
    <>
      <PageHero eyebrow="Press & Media" title="In the Spotlight" intro="Our verified television and print features, brand events and collaborations." />
      <div className="container-luxe">
        <nav className="mb-14 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[12px] uppercase tracking-[0.18em]">
          <Link href="/press" className={!kind ? "text-champagne-deep" : ""}>All</Link>
          {Object.entries(PRESS_KINDS).map(([k, label]) => <Link key={k} href={`/press?kind=${k}`} className={kind === k ? "text-champagne-deep" : "hover:text-champagne-deep"}>{label}</Link>)}
        </nav>
        {entries.length === 0 ? <Pending what="Press features and event stories" /> : (
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((e, i) => (
              <Link key={e.id} href={`/press/${e.slug}`} className={`group card-hover block ${i === 0 ? "sm:col-span-2 lg:col-span-3 lg:grid lg:grid-cols-12 lg:items-center lg:gap-14" : ""}`}>
                <div className={`relative aspect-[4/5] overflow-hidden bg-ivory ${i === 0 ? "lg:col-span-5" : ""}`}><Media src={e.coverImage ?? e.images[0]?.url} alt={e.title} sizes={i === 0 ? "(min-width:1024px) 40vw, 100vw" : "(min-width:1024px) 33vw, 50vw"} className="object-top" /></div>
                <div className={i === 0 ? "lg:col-span-7" : ""}>
                  <p className="eyebrow mt-6">{PRESS_KINDS[e.kind as keyof typeof PRESS_KINDS]}{e.eventDate && ` · ${formatDate(e.eventDate, { dateStyle: "long" })}`}</p>
                  <h2 className={`mt-3 font-serif ${i === 0 ? "text-4xl lg:text-5xl" : "text-3xl"}`}>{e.title}</h2>
                  {e.programName && <p className="mt-1 text-[14px] text-muted">{e.programName}</p>}
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{e.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
