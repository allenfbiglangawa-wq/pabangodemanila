import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Media } from "@/components/Media";

export const dynamic = "force-dynamic";
const load = (slug: string) => db.journalPost.findFirst({ where: { slug, isPublished: true } });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.title, description: p.excerpt, openGraph: { type: "article", images: p.coverImage ? [p.coverImage] : undefined } } : {};
}

export default async function JournalPost({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  return (
    <article className="pt-16">
      <header className="container-luxe max-w-3xl text-center">
        <p className="eyebrow">{formatDate(p.publishedAt, { dateStyle: "long" })}</p>
        <h1 className="display mt-5 text-5xl lg:text-7xl">{p.title}</h1>
        <p className="mt-6 font-serif text-2xl italic text-muted">{p.excerpt}</p>
      </header>
      {p.coverImage && <div className="container-luxe mt-14"><div className="relative aspect-[21/9] overflow-hidden bg-ivory"><Media src={p.coverImage} alt={p.title} priority /></div></div>}
      <div className="container-luxe prose-luxe mt-14 max-w-2xl">{p.body.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)}</div>
    </article>
  );
}
