import { db } from "@/lib/db";
import { deleteMedia, updateMediaAlt, uploadMedia } from "../../actions";
import { Field, Flash, PageTitle } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/CopyButton";

export default async function MediaLibrary({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const assets = await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <Flash sp={sp} />
      <PageTitle title="Media Library" sub="JPG, PNG, WebP, AVIF up to 8 MB; MP4 or WebM up to 40 MB. Files are checked by content, not just name. Images are resized and converted automatically when shown on the site." />
      <form action={uploadMedia} className="admin-card mb-6 flex flex-wrap items-end gap-3">
        <div><label className="admin-label">Files</label><input type="file" name="files" multiple required accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" className="text-[13px]" /></div>
        <Field label="Alt text (optional)" name="alt" />
        <button className="admin-btn">Upload</button>
      </form>
      {assets.length === 0 ? <p className="text-[13px] text-muted">No files yet.</p> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {assets.map((a) => (
            <div key={a.id} className="admin-card space-y-2 p-3 text-[11px]">
              {a.mimeType.startsWith("video/") ? <video src={a.url} className="aspect-square w-full bg-ivory object-cover" muted /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.url} alt={a.alt} className="aspect-square w-full bg-ivory object-cover" />}
              <p className="truncate" title={a.filename}>{a.filename}</p>
              <p className="text-muted">{(a.sizeBytes / 1024).toFixed(0)} KB</p>
              <CopyButton text={a.url} />
              <form action={updateMediaAlt} className="flex gap-1"><input type="hidden" name="id" value={a.id} /><input name="alt" defaultValue={a.alt} placeholder="Alt text" className="admin-input !py-1 !text-[11px]" /><button className="admin-btn-ghost !px-2 !py-1">Save</button></form>
              <form action={deleteMedia}><input type="hidden" name="id" value={a.id} /><button className="text-red-700 underline">Delete</button></form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
