import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PRESS_KINDS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Media } from "@/components/Media";
import { PlayIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

const load = (slug: string) => db.pressEntry.findFirst({ where: { slug, isPublished: true }, include: { images: { orderBy: { sortOrder: "asc" } } } });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await load((await params).slug);
  return e ? { title: e.title, description: e.description, openGraph: { images: e.coverImage ? [e.coverImage] : undefined } } : {};
}

/** Converts YouTube / Vimeo watch links into privacy-friendly embed URLs. */
function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;
  return null;
}

export default async function PressEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await load((await params).slug);
  if (!e) notFound();
  const links = JSON.parse(e.links || "[]") as { label: string; url: string }[];
  const embed = e.videoUrl ? embedUrl(e.videoUrl) : null;
  return (
    <article className="container-luxe max-w-5xl pt-16">
      <Link href="/press" className="text-[12px] uppercase tracking-[0.18em] text-muted">← Press & Events</Link>
      <p className="eyebrow mt-10">{PRESS_KINDS[e.kind as keyof typeof PRESS_KINDS]}{e.eventDate && ` · ${formatDate(e.eventDate, { dateStyle: "long" })}`}</p>
      <h1 className="display mt-4 text-5xl lg:text-7xl">{e.title}</h1>
      {e.programName && <p className="mt-4 text-[16px] text-muted">{e.programName}</p>}
      <p className="mt-8 max-w-3xl font-serif text-2xl leading-snug">{e.description}</p>

      <div className="mt-14">
        {embed ? (
          <div className="relative aspect-video bg-charcoal"><iframe src={embed} title={e.title} className="absolute inset-0 h-full w-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" /></div>
        ) : (
          e.coverImage && <div className="relative aspect-[16/9] overflow-hidden bg-ivory"><Media src={e.coverImage} alt={e.title} priority /></div>
        )}
      </div>
      {e.videoUrl && !embed && (
        <a href={e.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-8"><PlayIcon className="h-4 w-4" /> Watch</a>
      )}

      {e.body && <div className="prose-luxe mt-14 max-w-3xl">{e.body.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>}

      {e.images.length > 0 && (
        <div className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-3">
          {e.images.map((img) => (
            <figure key={img.id}>
              <div className="relative aspect-square overflow-hidden bg-ivory"><Media src={img.url} alt={img.caption ?? e.title} sizes="33vw" /></div>
              {img.caption && <figcaption className="mt-2 text-[12px] text-muted">{img.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {links.length > 0 && (
        <ul className="mt-14 space-y-2">
          {links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="btn-link">{l.label}</a></li>)}
        </ul>
      )}
    </article>
  );
}
