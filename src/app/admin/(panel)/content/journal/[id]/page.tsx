import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveJournal } from "../../../../actions";
import { Check, Field, Flash, PageTitle, TextArea } from "@/components/admin/ui";

export default async function JournalEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const p = id === "new" ? null : await db.journalPost.findUnique({ where: { id } });
  if (id !== "new" && !p) notFound();
  return (
    <div className="space-y-6">
      <Flash sp={sp} />
      <PageTitle title={p?.title ?? "New journal post"} actions={<Link href="/admin/content?tab=journal" className="admin-btn-ghost">All posts</Link>} />
      <form action={saveJournal} className="admin-card max-w-3xl space-y-4">
        {p && <input type="hidden" name="id" value={p.id} />}
        <Field label="Title" name="title" defaultValue={p?.title} required />
        <Field label="URL slug" name="slug" defaultValue={p?.slug} />
        <TextArea label="Excerpt" name="excerpt" defaultValue={p?.excerpt} rows={2} />
        <TextArea label="Body (blank line between paragraphs)" name="body" defaultValue={p?.body} rows={16} />
        <Field label="Cover image URL" name="coverImage" defaultValue={p?.coverImage} />
        <Check label="Published" name="isPublished" defaultChecked={p?.isPublished} />
        <button className="admin-btn">Save post</button>
      </form>
    </div>
  );
}
