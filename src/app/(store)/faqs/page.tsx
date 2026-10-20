import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { PageHero, Pending } from "@/components/store/PageHero";

export const metadata: Metadata = { title: "FAQs" };
export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const { faqs } = await getSetting("policies");
  return (
    <>
      <PageHero eyebrow="Customer Care" title="Frequently Asked Questions" />
      <div className="container-luxe max-w-3xl">
        {faqs.length === 0 ? <Pending what="Answers to common questions" /> : (
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((f, i) => (
              <details key={i} className="group py-6">
                <summary className="flex cursor-pointer list-none justify-between gap-6 font-serif text-2xl">{f.q}<span className="text-xl transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
