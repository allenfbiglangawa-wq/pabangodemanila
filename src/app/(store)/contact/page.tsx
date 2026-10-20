import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { submitContact } from "@/app/actions/inquiry";
import { ActionForm } from "@/components/ActionForm";
import { PageHero } from "@/components/store/PageHero";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const c = await getSetting("contact");
  return (
    <>
      <PageHero eyebrow="Contact" title="We’d Love to Hear From You" />
      <div className="container-luxe grid max-w-5xl gap-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-8 text-[15px]">
          {c.email && <div><p className="eyebrow mb-2">Email</p><a href={`mailto:${c.email}`} className="underline">{c.email}</a></div>}
          {c.phone && <div><p className="eyebrow mb-2">Phone</p><a href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a></div>}
          {c.address && <div><p className="eyebrow mb-2">Studio</p><p className="whitespace-pre-line">{c.address}</p></div>}
          <div>
            <p className="eyebrow mb-2">Social</p>
            <ul className="space-y-2">
              {c.messengerUrl && <li><a href={c.messengerUrl} target="_blank" rel="noopener noreferrer" className="underline">Message us on Messenger</a></li>}
              {c.instagramUrl && <li><a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" className="underline">Instagram</a></li>}
              {c.facebookUrl && <li><a href={c.facebookUrl} target="_blank" rel="noopener noreferrer" className="underline">Facebook</a></li>}
            </ul>
          </div>
        </div>
        <ActionForm action={submitContact} submitLabel="Send Message" hideOnSuccess>
          <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" name="name" required className="field" /></div>
            <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" required className="field" /></div>
          </div>
          <div><label className="label" htmlFor="c-subject">Subject</label><input id="c-subject" name="subject" required className="field" /></div>
          <div><label className="label" htmlFor="c-msg">Message</label><textarea id="c-msg" name="message" rows={6} required className="field" /></div>
        </ActionForm>
      </div>
    </>
  );
}
