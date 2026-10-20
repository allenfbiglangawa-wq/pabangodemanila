import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { moderateReview } from "../../actions";
import { Flash, PageTitle } from "@/components/admin/ui";
import { Stars } from "@/components/store/Stars";

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ filter?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const filter = sp.filter ?? "pending";
  const where: Prisma.ReviewWhereInput =
    filter === "reported" ? { reports: { some: { resolved: false } } } : filter === "approved" ? { status: "APPROVED" } : filter === "rejected" ? { status: "REJECTED" } : { status: "PENDING" };
  const reviews = await db.review.findMany({ where, include: { product: { select: { name: true, slug: true } }, media: true, reports: { where: { resolved: false } }, user: { select: { email: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <Flash sp={sp} />
      <PageTitle title="Reviews" sub="Reviews come only from signed-in customers. Moderate fairly: reject spam, abuse or personal data, not honest criticism. Reviews cannot be written or edited from the dashboard." />
      <div className="mb-5 flex gap-1.5 text-[12px]">
        {["pending", "reported", "approved", "rejected"].map((f) => <Link key={f} href={`/admin/reviews?filter=${f}`} className={`badge border border-line ${filter === f ? "bg-charcoal text-pearl" : ""}`}>{f}</Link>)}
      </div>
      <div className="space-y-4">
        {reviews.length === 0 && <p className="text-[13px] text-muted">Nothing here.</p>}
        {reviews.map((r) => (
          <article key={r.id} className="admin-card text-[13px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><Stars value={r.rating} /><Link href={`/products/${r.product.slug}`} className="font-medium hover:underline" target="_blank">{r.product.name}</Link>{r.isVerifiedPurchase && <span className="badge bg-emerald-50 text-emerald-800">Verified purchase</span>}</div>
              <span className="text-muted">{r.displayName} · {r.user?.email ?? "deleted account"} · {formatDate(r.createdAt)}</span>
            </div>
            {r.title && <p className="mt-2 font-medium">{r.title}</p>}
            <p className="mt-1 whitespace-pre-line">{r.body}</p>
            {r.media.length > 0 && <div className="mt-2 flex gap-2">{r.media.map((m) => m.type === "IMAGE" ? /* eslint-disable-next-line @next/next/no-img-element */ <img key={m.id} src={m.url} alt="" className="h-16 w-16 object-cover" /> : <a key={m.id} href={m.url} className="underline" target="_blank" rel="noopener noreferrer">Video</a>)}</div>}
            {r.reports.length > 0 && <p className="mt-2 rounded-sm bg-amber-50 p-2 text-amber-900">Reported {r.reports.length}×: {[...new Set(r.reports.map((x) => x.reason))].join(", ")}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <form action={moderateReview} className="flex gap-2">
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="filter" value={filter} />
                <input name="moderationNote" placeholder="Reason (kept internally)" defaultValue={r.moderationNote ?? ""} className="admin-input !w-56 !py-1" />
                {r.status !== "APPROVED" && <button name="decision" value="approve" className="admin-btn !py-1">Approve</button>}
                {r.status !== "REJECTED" && <button name="decision" value="reject" className="admin-btn-ghost !py-1">Reject</button>}
                {r.reports.length > 0 && <button name="decision" value="dismiss-reports" className="admin-btn-ghost !py-1">Dismiss reports</button>}
                {r.status === "APPROVED" && <button name="decision" value="homepage" className="admin-btn-ghost !py-1">{r.showOnHomepage ? "Remove from homepage" : "Show on homepage"}</button>}
              </form>
            </div>
            <form action={moderateReview} className="mt-3 flex gap-2">
              <input type="hidden" name="id" value={r.id} /><input type="hidden" name="filter" value={filter} /><input type="hidden" name="decision" value="respond" />
              <input name="adminResponse" defaultValue={r.adminResponse ?? ""} placeholder="Public response from Pabango de Manila (optional)" className="admin-input !py-1" />
              <button className="admin-btn-ghost !py-1">Save response</button>
            </form>
          </article>
        ))}
      </div>
    </>
  );
}
