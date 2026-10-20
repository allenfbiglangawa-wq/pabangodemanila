import { db } from "@/lib/db";
import { centavosToPesosInput, formatPHP } from "@/lib/money";
import { manilaDate } from "@/lib/analytics";
import { saveDiscount } from "../../actions";
import { Check, Field, Flash, PageTitle } from "@/components/admin/ui";

export default async function Promotions({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const codes = await db.discountCode.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <Flash sp={sp} />
      <PageTitle title="Promotions" sub="Discount codes customers enter in their bag. Featured products and homepage campaigns are managed in Products and Website Content." />
      <div className="space-y-3">
        {[...codes, null].map((c) => (
          <form key={c?.id ?? "new"} action={saveDiscount} className="admin-card grid items-end gap-3 md:grid-cols-4 xl:grid-cols-[1fr_1.4fr_110px_100px_1fr_1fr_1fr_90px_auto_auto]">
            {c && <input type="hidden" name="id" value={c.id} />}
            <Field label={c ? `Code · used ${c.usedCount}×` : "New code"} name="code" defaultValue={c?.code} required />
            <Field label="Description" name="description" defaultValue={c?.description} />
            <div><label className="admin-label">Type</label><select name="type" defaultValue={c?.type ?? "PERCENT"} className="admin-input"><option value="PERCENT">% off</option><option value="FIXED">₱ off</option></select></div>
            <Field label="Value" name="value" defaultValue={c ? (c.type === "PERCENT" ? c.value : centavosToPesosInput(c.value)) : ""} required />
            <Field label="Min. subtotal (₱)" name="minSubtotal" defaultValue={c ? centavosToPesosInput(c.minSubtotal) : ""} />
            <Field label="Starts" name="startsAt" type="date" defaultValue={c?.startsAt ? manilaDate(c.startsAt) : ""} />
            <Field label="Ends" name="endsAt" type="date" defaultValue={c?.endsAt ? manilaDate(c.endsAt) : ""} />
            <Field label="Limit" name="usageLimit" type="number" defaultValue={c?.usageLimit ?? ""} />
            <Check label="Active" name="isActive" defaultChecked={c?.isActive ?? true} />
            <button className="admin-btn">{c ? "Save" : "Create"}</button>
            {c && c.minSubtotal > 0 && <p className="text-[11px] text-muted md:col-span-4 xl:col-span-10">Applies to bags of {formatPHP(c.minSubtotal)} or more.</p>}
          </form>
        ))}
      </div>
      <p className="mt-6 text-[12px] text-muted">Abandoned-cart recovery emails, loyalty points, gift cards and referrals are prepared in the data model but switched off until you choose an email provider and confirm consent wording.</p>
    </>
  );
}
