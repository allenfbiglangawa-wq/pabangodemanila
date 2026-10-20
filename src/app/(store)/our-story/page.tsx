import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { Media } from "@/components/Media";
import { PageHero } from "@/components/store/PageHero";

export const metadata: Metadata = { title: "Our Story" };
export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const story = await getSetting("story");
  return (
    <>
      <PageHero eyebrow="Our Story" title={story.heading} />
      <div className="container-luxe grid gap-14 lg:grid-cols-2 lg:gap-24">
        <div className="relative aspect-[4/5] overflow-hidden bg-ivory">
          <Media src={story.image} alt="Pabango de Manila" sizes="(min-width:1024px) 50vw, 100vw" priority />
        </div>
        <div className="prose-luxe self-center">
          {story.body.split(/\n\n+/).map((p, i) => (
            <p key={i} className={i === 0 ? "font-serif text-3xl leading-snug text-charcoal" : ""}>{p}</p>
          ))}
          <div className="flex gap-6 pt-6">
            <Link href="/shop" className="btn-primary">Explore Collection</Link>
            <Link href="/event-scenting" className="btn-link self-center">Event Scenting</Link>
          </div>
        </div>
      </div>
    </>
  );
}
