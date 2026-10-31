import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { Media } from "@/components/Media";
import { PageHero } from "@/components/store/PageHero";

export const metadata: Metadata = { title: "About Us" };
export const dynamic = "force-dynamic";

// About Us copy, word for word from the client's revision document (31 Oct 2026).
const SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "A Journey Rooted in the Art of Fragrance",
    paragraphs: [
      "Pabango de Manila was born from a simple belief: fragrance has the power to transform how we feel, experience, and connect with the spaces around us.",
      "Founded on March 21, 2021, Pabango de Manila began in a modest 30-square-meter condominium in Makati City during the global lockdown. What started as a personal pursuit of creating a more calming atmosphere and finding comfort through scent gradually grew into a deeper appreciation for the art and science of fragrance.",
      "Inspired by the desire to create home fragrances that were both beautiful and thoughtfully formulated, we began exploring the relationship between fragrance composition, material quality, and the sensory experience of a finished product. We wanted to create more than something that simply smelled pleasant. We wanted fragrances that could bring character to a space, evoke emotion, and become part of everyday life.",
    ],
  },
  {
    heading: "From a Small Beginning to a Fragrance House",
    paragraphs: [
      "As our understanding of fragrance evolved, so did Pabango de Manila.",
      "What began with scented candles gradually expanded into a wider collection of home and lifestyle fragrances, including reed diffusers, room and linen sprays, and diffuser oils. Through continuous experimentation, technical learning, and hands-on craftsmanship, we developed our approach to fragrance creation—bringing together scientific principles and artisanal methods.",
      "Our commitment to learning and refinement has remained central to our journey. From fragrance education and perfumery mentorship to the careful evaluation of raw materials and product performance, every experience has contributed to how we formulate and create.",
    ],
  },
  {
    heading: "Beyond Products: Creating Scent Experiences",
    paragraphs: [
      "Today, Pabango de Manila continues to evolve into a Filipino fragrance house offering more than individual scented products.",
      "We extend our expertise to private-label and bespoke fragrance development, business-to-business partnerships, and scentscaping solutions for commercial and hospitality environments.",
      "We believe fragrance should be experienced beyond the bottle or the candle. It can define a space, strengthen a brand identity, create a sense of familiarity, and turn ordinary moments into memorable experiences.",
    ],
  },
  {
    heading: "Our Philosophy",
    paragraphs: [
      "At Pabango de Manila, we believe that fragrance is deeply personal.",
      "Every creation begins with an intention—to create an atmosphere, express an identity, or bring a particular feeling to life. We approach each product with thoughtful formulation, attention to detail, and an appreciation for the craft behind every scent.",
      "Our story is one of curiosity, craftsmanship, and resilience. From a modest beginning in 2021 to the fragrance house we continue to build, we remain guided by the same belief that started it all: that fragrance can make everyday living more meaningful.",
      "We are proud of how far we have come, grateful for every lesson along the way, and inspired by everything still ahead.",
    ],
  },
];

export default async function StoryPage() {
  const story = await getSetting("story");
  return (
    <>
      <PageHero eyebrow="About Us" title="Our History & Evolution" />
      <div className="container-luxe grid gap-14 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-ivory shadow-xl lg:sticky lg:top-28">
            <Media src={story.image} alt="Pabango de Manila" sizes="(min-width:1024px) 40vw, 100vw" priority />
          </div>
        </div>
        <div className="space-y-14 lg:col-span-7">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="display text-3xl text-maroon lg:text-4xl">{s.heading}</h2>
              <div className="prose-luxe mt-5">
                {s.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          ))}
          <div className="flex flex-col items-start gap-6 border-t border-maroon/15 pt-10">
            <Image src="/brand/v2/logo-lockup-maroon.png" alt="Pabango de Manila, A Filipino Fragrance House" width={726} height={864} className="h-28 w-auto" />
            <div className="flex gap-6">
              <Link href="/shop" className="btn-primary">Explore Collection</Link>
              <Link href="/event-scenting" className="btn-link self-center">Event Scenting</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
