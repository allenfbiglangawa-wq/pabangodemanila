import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { BUSINESS_INQUIRY_TYPES, INQUIRY_TYPES } from "@/lib/constants";
import { PageHero } from "@/components/store/PageHero";
import { InquiryForm } from "@/components/store/InquiryForm";

export const metadata: Metadata = {
  title: "Private Label & Business Scenting",
  description: "Private and white label candles and home fragrance, business scent subscriptions, hotel amenities, café candles and corporate gifts, made in Parañaque.",
};
export const dynamic = "force-dynamic";

export default async function PrivateLabelPage() {
  const b = await getSetting("business");
  return (
    <>
      <PageHero eyebrow="Private Label & B2B" title={b.heading} intro={b.intro} />
      <section className="container-luxe">
        <ul className="grid gap-px bg-line md:grid-cols-2 lg:grid-cols-3">
          {b.services.map((line, i) => {
            const [title, text] = line.split("|").map((x) => x.trim());
            return (
              <li key={title} className="bg-pearl p-8 lg:p-10">
                <span className="font-serif text-3xl text-champagne-deep">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="mt-4 font-serif text-3xl">{title}</h2>
                {text && <p className="mt-3 text-[15px] leading-relaxed text-muted">{text}</p>}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="bg-ivory mt-24 py-24">
        <div className="container-luxe grid gap-12 lg:grid-cols-3">
          {[
            ["Formulated with care", "Every formula is developed in our studio with calibrated pour temperatures, wick testing, cure times and burn or diffusion checks."],
            ["Clean materials", "Soy wax, beeswax and Philippine coconut oil, with phthalate-free fragrance oils."],
            ["Made locally", "Produced in Parañaque City with Filipino suppliers and community artisans, and delivered nationwide."],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-serif text-3xl">{t}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="inquire" className="container-luxe scroll-mt-28 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="display text-center text-5xl">Start a Conversation</h2>
          <p className="mx-auto mt-5 max-w-lg text-center text-muted">Tell us about your brand or space. We will reply with options and a tailored quotation.</p>
          <div className="mt-14"><InquiryForm eventTypes={INQUIRY_TYPES} defaultType={BUSINESS_INQUIRY_TYPES[0]} dateLabel="Target start date *" /></div>
        </div>
      </section>
    </>
  );
}
