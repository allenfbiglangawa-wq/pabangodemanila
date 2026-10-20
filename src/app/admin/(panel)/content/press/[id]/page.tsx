import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { manilaDate } from "@/lib/analytics";
import { PRESS_KINDS } from "@/lib/constants";
import { addPressImage, deletePress, removePressImage, savePress } from "../../../../actions";
import { Check, Field, Flash, PageTitle, TextArea } from "@/components/admin/ui";

export default async function PressEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const e = id === "new" ? null : await db.pressEntry.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } } } });
  if (id !== "new" && !e) notFound();
  const links = e ? (JSON.parse(e.links) as { label: string; url: string }[]) : [];
  return (
    <div className="space-y-6">
      <Flash sp={sp} />
      <PageTitle title={e?.title ?? "New press / event entry"} actions={<>{e?.isPublished && <Link href={`/press/${e.slug}`} className="admin-btn-ghost" target="_blank">View ↗</Link>}<Link href="/admin/content?tab=press" className="admin-btn-ghost">All entries</Link></>} />
      <form action={savePress} className="admin-card grid max-w-4xl gap-4 md:grid-cols-2">
        {e && <input type="hidden" name="id" value={e.id} />}
        <Field label="Title" name="title" defaultValue={e?.title} required />
        <div><label className="admin-label">Type</label><select name="kind" defaultValue={e?.kind ?? "EVENT"} className="admin-input">{Object.entries(PRESS_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <Field label="Program / publication / event name (verified)" name="programName" defaultValue={e?.programName} />
        <Field label="Date" name="eventDate" type="date" defaultValue={e?.eventDate ? manilaDate(e.eventDate) : ""} />
        <TextArea label="Short description" name="description" defaultValue={e?.description} rows={3} className="md:col-span-2" />
        <TextArea label="Full story (optional)" name="body" defaultValue={e?.body} rows={6} className="md:col-span-2" />
        <Field label="Cover image URL" name="coverImage" defaultValue={e?.coverImage} hint="From the Media Library. Authorised photos only." />
        <Field label="Video URL (YouTube, Vimeo or MP4)" name="videoUrl" defaultValue={e?.videoUrl} hint="Embedded only when you have permission." />
        <TextArea label="Related links (one per line: label | https://…)" name="links" defaultValue={links.map((l) => `${l.label} | ${l.url}`).join("\n")} rows={3} className="md:col-span-2" />
        <Field label="URL slug" name="slug" defaultValue={e?.slug} />
        <Field label="Sort order" name="sortOrder" type="number" defaultValue={e?.sortOrder ?? 0} />
        <div className="flex gap-6 md:col-span-2"><Check label="Published" name="isPublished" defaultChecked={e?.isPublished} /><Check label="Feature on homepage" name="featureOnHome" defaultChecked={e?.featureOnHome} /></div>
        <div className="md:col-span-2"><button className="admin-btn">Save entry</button></div>
      </form>
      {e && (
        <section className="admin-card max-w-4xl">
          <h2 className="mb-3 text-[13px] font-medium">Photo gallery</h2>
          <div className="flex flex-wrap gap-3">
            {e.images.map((img) => (
              <div key={img.id} className="w-32 text-[11px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.caption ?? ""} className="aspect-square w-full object-cover" />
                <p className="truncate text-muted">{img.caption}</p>
                <form action={removePressImage}><input type="hidden" name="pressEntryId" value={e.id} /><input type="hidden" name="imageId" value={img.id} /><button className="text-red-700 underline">Remove</button></form>
              </div>
            ))}
          </div>
          <form action={addPressImage} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <input type="hidden" name="pressEntryId" value={e.id} />
            <div><label className="admin-label">Upload</label><input type="file" name="file" accept="image/jpeg,image/png,image/webp" className="text-[12px]" /></div>
            <Field label="…or image URL" name="url" />
            <Field label="Caption" name="caption" />
            <button className="admin-btn">Add</button>
          </form>
          <form action={deletePress} className="mt-8 border-t border-line pt-4"><input type="hidden" name="id" value={e.id} /><button className="text-[12px] text-red-700 underline">Delete this entry</button></form>
        </section>
      )}
    </div>
  );
}
