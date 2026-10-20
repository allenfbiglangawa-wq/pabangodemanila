import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Media } from "@/components/Media";
import { PageHero, Pending } from "@/components/store/PageHero";

export const metadata: Metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const posts = await db.journalPost.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" } });
  return (
    <>
      <PageHero eyebrow="Journal" title="Notes on Scent" intro="Stories, rituals and the craft behind each fragrance." />
      <div className="container-luxe">
        {posts.length === 0 ? <Pending what="Journal stories" /> : (
          <div className="grid gap-x-8 gap-y-16 md:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} href={`/journal/${p.slug}`} className="card-hover group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-ivory"><Media src={p.coverImage} alt={p.title} sizes="33vw" /></div>
                <p className="eyebrow mt-6">{formatDate(p.publishedAt, { dateStyle: "long" })}</p>
                <h2 className="mt-2 font-serif text-3xl">{p.title}</h2>
                <p className="mt-3 text-[14px] text-muted">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
