import Link from "next/link";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { PRESS_KINDS } from "@/lib/constants";
import { saveSettingGroup, uploadHeroVideo } from "../../actions";
import { Check, Field, Flash, PageTitle, TextArea } from "@/components/admin/ui";

const TABS = [
  ["announcement", "Announcement"],
  ["hero", "Hero"],
  ["story", "Brand story"],
  ["events", "Event scenting"],
  ["business", "Private label & stockists"],
  ["home", "Homepage media & reviews"],
  ["press", "Press & events"],
  ["journal", "Journal"],
  ["contact", "Contact & footer"],
  ["policies", "Policies & FAQs"],
  ["seo", "SEO"],
] as const;

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ tab?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "announcement";
  const backTo = `/admin/content?tab=${tab}`;
  const Form = ({ group, children }: { group: string; children: React.ReactNode }) => (
    <form action={saveSettingGroup} className="admin-card max-w-3xl space-y-4">
      <input type="hidden" name="key" value={group} />
      <input type="hidden" name="back" value={backTo} />
      {children}
      <button className="admin-btn">Save</button>
    </form>
  );

  let body: React.ReactNode = null;
  if (tab === "announcement") {
    const a = await getSetting("announcement");
    body = <Form group="announcement"><Check label="Show the announcement bar" name="enabled" defaultChecked={a.enabled} /><TextArea label="Messages (one per line; they rotate)" name="messages" defaultValue={a.messages.join("\n")} hint="Only announce offers and policies you actually provide." /></Form>;
  } else if (tab === "hero") {
    const h = await getSetting("hero");
    body = (
      <div className="space-y-6">
        <Form group="hero">
          <Field label="Eyebrow / tagline" name="tagline" defaultValue={h.tagline} />
          <Field label="Headline" name="headline" defaultValue={h.headline} />
          <Field label="Subheadline" name="subheadline" defaultValue={h.subheadline} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primary button" name="primaryLabel" defaultValue={h.primaryLabel} /><Field label="Primary link" name="primaryHref" defaultValue={h.primaryHref} />
            <Field label="Secondary button" name="secondaryLabel" defaultValue={h.secondaryLabel} /><Field label="Secondary link" name="secondaryHref" defaultValue={h.secondaryHref} />
          </div>
          <Field label="Video URL" name="videoUrl" defaultValue={h.videoUrl} hint="Muted, looping MP4 or WebM, 6–12 seconds, ideally under 4 MB. Leave blank for image only." />
          <Field label="Poster / fallback image URL" name="posterImage" defaultValue={h.posterImage} hint="Shown first, and always to visitors who prefer reduced motion." />
        </Form>
        <form action={uploadHeroVideo} className="admin-card max-w-3xl space-y-3">
          <p className="text-[13px] font-medium">Upload a new hero video or poster image</p>
          <input type="file" name="file" accept="video/mp4,video/webm,image/jpeg,image/png,image/webp" required className="text-[13px]" />
          <button className="admin-btn-ghost">Upload</button>
        </form>
      </div>
    );
  } else if (tab === "story") {
    const s = await getSetting("story");
    body = <Form group="story"><Field label="Heading" name="heading" defaultValue={s.heading} /><TextArea label="Story (blank line between paragraphs)" name="body" defaultValue={s.body} rows={12} hint="Use the owner’s real story. The homepage shows the first two paragraphs." /><Field label="Image URL" name="image" defaultValue={s.image} /></Form>;
  } else if (tab === "events") {
    const e = await getSetting("eventScenting");
    body = <Form group="eventScenting"><Field label="Heading" name="heading" defaultValue={e.heading} /><Field label="Description" name="description" defaultValue={e.description} /><TextArea label="Service introduction" name="intro" defaultValue={e.intro} rows={6} /><TextArea label="How it works (one step per line)" name="steps" defaultValue={e.steps.join("\n")} rows={5} /><Field label="Hero image URL" name="heroImage" defaultValue={e.heroImage} /><Field label="Price headline (leave blank to hide)" name="priceHeadline" defaultValue={e.priceHeadline} /><Field label="Price note" name="priceNote" defaultValue={e.priceNote} /><TextArea label="Reservation terms (one per line)" name="reservation" defaultValue={e.reservation.join("\n")} rows={4} /><TextArea label="Inclusions (one per line)" name="inclusions" defaultValue={e.inclusions.join("\n")} rows={6} /><Field label="Inclusions footnote" name="inclusionsNote" defaultValue={e.inclusionsNote} /><TextArea label="Why us (one per line, “Title | description”)" name="whyUs" defaultValue={e.whyUs.join("\n")} rows={5} /><TextArea label="Gallery (one per line, “image URL | caption”)" name="gallery" defaultValue={e.gallery.join("\n")} rows={5} /></Form>;
  } else if (tab === "business") {
    const [b, st] = await Promise.all([getSetting("business"), getSetting("stockists")]);
    body = (
      <div className="space-y-6">
        <Form group="business"><Field label="Heading" name="heading" defaultValue={b.heading} /><TextArea label="Introduction" name="intro" defaultValue={b.intro} rows={3} /><TextArea label="Services (one per line: title | description)" name="services" defaultValue={b.services.join("\n")} rows={6} /></Form>
        <Form group="stockists"><Field label="Heading" name="heading" defaultValue={st.heading} /><TextArea label="Text" name="body" defaultValue={st.body} rows={2} /><TextArea label="Store locations (one per line)" name="locations" defaultValue={st.locations.join("\n")} rows={5} /><Field label="Shopee shop URL (optional)" name="shopeeUrl" defaultValue={st.shopeeUrl} /><Field label="TikTok Shop URL (optional)" name="tiktokUrl" defaultValue={st.tiktokUrl} /></Form>
      </div>
    );
  } else if (tab === "home") {
    const [ig, nl, ext] = await Promise.all([getSetting("instagram"), getSetting("newsletter"), getSetting("externalReviews")]);
    const [sp, mo] = await Promise.all([getSetting("spotlight"), getSetting("moments")]);
    body = (
      <div className="space-y-6">
        <Form group="instagram"><Field label="Instagram profile URL" name="profileUrl" defaultValue={ig.profileUrl} /><TextArea label="Approved gallery images (one per line: image URL | alt text | post link)" name="images" defaultValue={ig.images.map((i) => [i.url, i.alt, i.link].join(" | ")).join("\n")} rows={6} hint="Upload your own approved photos to the Media Library and paste their URLs. No scraping is used." /></Form>
        <Form group="spotlight"><Field label="In the Spotlight: eyebrow" name="eyebrow" defaultValue={sp.eyebrow} /><Field label="Heading" name="heading" defaultValue={sp.heading} /><TextArea label="Introduction" name="intro" defaultValue={sp.intro} rows={3} /><Field label="Main photo (image URL | caption)" name="image" defaultValue={sp.image} hint="Upload in Media Library, then paste the URL here." /><Field label="Second photo (image URL | caption, optional)" name="secondaryImage" defaultValue={sp.secondaryImage} /><Field label="Official interview video link" name="videoUrl" defaultValue={sp.videoUrl} hint="The Watch Our Story button only appears when this is set." /></Form>
        <Form group="moments"><Field label="Moments & Milestones: eyebrow" name="eyebrow" defaultValue={mo.eyebrow} /><Field label="Heading" name="heading" defaultValue={mo.heading} /><Field label="Featured photo (image URL | caption)" name="featured" defaultValue={mo.featured} /><TextArea label="Gallery (one per line: image URL | caption)" name="gallery" defaultValue={mo.gallery.join("\n")} rows={5} hint="Use verified captions only, and only photos you have permission to publish." /></Form>
        <Form group="externalReviews"><TextArea label="Customer feedback from other channels (one per line: name | source | product | quote)" name="items" defaultValue={ext.items.join("\n")} rows={4} hint="Only genuine feedback you received, e.g. a Shopee review, with the customer's permission. It is shown with its source and is never counted as a website review." /></Form>
        <Form group="newsletter"><Field label="Heading" name="heading" defaultValue={nl.heading} /><TextArea label="Text" name="body" defaultValue={nl.body} rows={2} /><TextArea label="Consent statement shown next to the checkbox" name="consentText" defaultValue={nl.consentText} rows={2} /></Form>
      </div>
    );
  } else if (tab === "contact") {
    const c = await getSetting("contact");
    body = <Form group="contact"><TextArea label="Footer about text" name="footerAbout" defaultValue={c.footerAbout} rows={2} /><Field label="Footer tagline" name="tagline" defaultValue={c.tagline} /><Field label="Email" name="email" defaultValue={c.email} /><Field label="Phone" name="phone" defaultValue={c.phone} /><TextArea label="Address (optional)" name="address" defaultValue={c.address} rows={2} /><Field label="Facebook URL" name="facebookUrl" defaultValue={c.facebookUrl} /><Field label="Instagram URL" name="instagramUrl" defaultValue={c.instagramUrl} /><Field label="Messenger link (m.me/…)" name="messengerUrl" defaultValue={c.messengerUrl} /></Form>;
  } else if (tab === "policies") {
    const p = await getSetting("policies");
    body = <Form group="policies"><p className="text-[12px] text-muted">Pages stay marked “to be confirmed” until text is saved here. Have these reviewed before launch.</p><TextArea label="Shipping policy" name="shipping" defaultValue={p.shipping} rows={6} /><TextArea label="Return & refund policy" name="returns" defaultValue={p.returns} rows={6} /><TextArea label="Privacy policy (Data Privacy Act of 2012)" name="privacy" defaultValue={p.privacy} rows={6} /><TextArea label="Terms & conditions" name="terms" defaultValue={p.terms} rows={6} /><TextArea label="FAQs (question on the first line, answer below, blank line between FAQs)" name="faqs" defaultValue={p.faqs.map((f) => `${f.q}\n${f.a}`).join("\n\n")} rows={10} /></Form>;
  } else if (tab === "seo") {
    const s = await getSetting("seo");
    body = <Form group="seo"><Field label="Site title" name="title" defaultValue={s.title} /><TextArea label="Default meta description" name="description" defaultValue={s.description} rows={2} /><Field label="Default social share image URL" name="ogImage" defaultValue={s.ogImage} /><Field label="Google Search Console verification code" name="googleSiteVerification" defaultValue={s.googleSiteVerification} hint="The content value of the google-site-verification meta tag. Then submit /sitemap.xml in Search Console." /></Form>;
  } else if (tab === "press") {
    const entries = await db.pressEntry.findMany({ orderBy: [{ sortOrder: "asc" }, { eventDate: "desc" }] });
    body = (
      <div className="max-w-4xl space-y-3">
        <p className="text-[12px] text-muted">Publish only verified details and media you are authorised to use. Don’t use broadcaster logos or footage without permission, and name attendees only when verified and relevant.</p>
        <Link href="/admin/content/press/new" className="admin-btn">New entry</Link>
        <div className="admin-card p-0"><table className="admin-table"><thead><tr><th>Title</th><th>Type</th><th>Date</th><th>Status</th></tr></thead><tbody>
          {entries.map((e) => <tr key={e.id}><td><Link href={`/admin/content/press/${e.id}`} className="font-medium hover:underline">{e.title}</Link>{e.featureOnHome && <span className="block text-[11px] text-muted">On homepage</span>}</td><td>{PRESS_KINDS[e.kind as keyof typeof PRESS_KINDS]}</td><td>{formatDate(e.eventDate)}</td><td>{e.isPublished ? "Published" : "Draft"}</td></tr>)}
        </tbody></table></div>
      </div>
    );
  } else if (tab === "journal") {
    const posts = await db.journalPost.findMany({ orderBy: { createdAt: "desc" } });
    body = (
      <div className="max-w-4xl space-y-3">
        <Link href="/admin/content/journal/new" className="admin-btn">New post</Link>
        <div className="admin-card p-0"><table className="admin-table"><thead><tr><th>Title</th><th>Published</th></tr></thead><tbody>
          {posts.length === 0 && <tr><td colSpan={2} className="text-muted">No posts yet.</td></tr>}
          {posts.map((p) => <tr key={p.id}><td><Link href={`/admin/content/journal/${p.id}`} className="font-medium hover:underline">{p.title}</Link></td><td>{p.isPublished ? formatDate(p.publishedAt) : "Draft"}</td></tr>)}
        </tbody></table></div>
      </div>
    );
  }

  return (
    <>
      <Flash sp={sp} />
      <PageTitle title="Website Content" sub="Change what customers see without touching code." />
      <div className="mb-6 flex flex-wrap gap-x-4 gap-y-2 border-b border-line text-[13px]">
        {TABS.map(([k, l]) => <Link key={k} href={`/admin/content?tab=${k}`} className={`pb-2 ${tab === k ? "border-b-2 border-charcoal" : "text-muted"}`}>{l}</Link>)}
      </div>
      {body}
    </>
  );
}
