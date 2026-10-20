import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSetting } from "@/lib/settings";
import { PageHero, Pending } from "@/components/store/PageHero";

export const dynamic = "force-dynamic";

const TITLES = { shipping: "Shipping Policy", returns: "Return & Refund Policy", privacy: "Privacy Policy", terms: "Terms & Conditions" } as const;
type Slug = keyof typeof TITLES;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return slug in TITLES ? { title: TITLES[slug as Slug] } : {};
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in TITLES)) notFound();
  const policies = await getSetting("policies");
  const text = policies[slug as Slug];
  return (
    <>
      <PageHero eyebrow="Policies" title={TITLES[slug as Slug]} />
      <div className="container-luxe max-w-3xl">
        {text ? <div className="prose-luxe">{text.split(/\n\n+/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div> : <Pending what={`Our ${TITLES[slug as Slug].toLowerCase()}`} />}
      </div>
    </>
  );
}
