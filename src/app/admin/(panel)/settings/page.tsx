import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { centavosToPesosInput } from "@/lib/money";
import { PH_REGIONS } from "@/lib/constants";
import { deleteShippingRule, saveSettingGroup, saveShippingRule, saveStaff } from "../../actions";
import { Check, Field, Flash, PageTitle, TextArea } from "@/components/admin/ui";

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const admin = await requireAdmin({ ownerOnly: true });
  const [c, rules, staff] = await Promise.all([getSetting("commerce"), db.shippingRule.findMany({ orderBy: { region: "asc" } }), db.user.findMany({ where: { role: { in: ["ADMIN", "STAFF"] } } })]);
  const provider = process.env.PAYMENT_PROVIDER || "stub";
  return (
    <div className="space-y-8">
      <Flash sp={sp} />
      <PageTitle title="Settings" sub="Owner-only." />

      <section className="admin-card max-w-3xl">
        <h2 className="text-[13px] font-medium">Payment provider</h2>
        <p className="mt-2 text-[13px]">Current: <strong>{provider === "stub" ? "Development simulator (no real payments)" : provider}</strong></p>
        {provider === "stub" && <p className="mt-2 text-[12px] text-amber-800">Choose a Philippine payment provider (e.g. PayMongo or Xendit) after confirming merchant eligibility, fees and supported methods. Your developer then sets PAYMENT_PROVIDER and the API keys. Until this is done, GCash, Maya and card payments are hidden at checkout on the live site and customers can only pay by bank transfer (or COD if enabled).</p>}
      </section>

      <form action={saveSettingGroup} className="admin-card max-w-3xl space-y-4">
        <input type="hidden" name="key" value="commerce" /><input type="hidden" name="back" value="/admin/settings" />
        <h2 className="text-[13px] font-medium">Checkout & payments</h2>
        <div className="flex flex-wrap gap-6">
          <Check label="GCash, Maya & cards (online)" name="onlinePaymentsEnabled" defaultChecked={c.onlinePaymentsEnabled} />
          <Check label="Bank transfer" name="bankTransferEnabled" defaultChecked={c.bankTransferEnabled} />
          <Check label="Cash on delivery" name="codEnabled" defaultChecked={c.codEnabled} />
        </div>
        <TextArea label="Bank transfer details shown to customers" name="bankDetails" defaultValue={c.bankDetails} rows={4} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Hold stock for online payment (minutes)" name="reservationMinutesOnline" type="number" defaultValue={c.reservationMinutesOnline} />
          <Field label="Hold stock for bank transfer (hours)" name="reservationHoursBankTransfer" type="number" defaultValue={c.reservationHoursBankTransfer} />
          <Field label="Estimated payment fee (%)" name="estimatedFeePercent" type="number" step="0.01" defaultValue={c.estimatedFeePercent} hint="Used only when the provider does not report fees." />
        </div>
        <Field label="Email for low-stock alerts (optional)" name="lowStockEmail" defaultValue={c.lowStockEmail} />
        <button className="admin-btn">Save</button>
      </form>

      <section className="admin-card max-w-4xl">
        <h2 className="mb-1 text-[13px] font-medium">Shipping rates</h2>
        <p className="mb-4 text-[12px] text-muted">A region-specific rate wins; otherwise the rate with no region applies. Courier API integration can replace these later.</p>
        <div className="space-y-3">
          {[...rules, null].map((r) => (
            <div key={r?.id ?? "new"} className="flex flex-wrap items-end gap-2 border-b border-line pb-3">
              <form action={saveShippingRule} className="grid flex-1 items-end gap-2 md:grid-cols-[1.4fr_1.6fr_100px_120px_auto_auto]">
                {r && <input type="hidden" name="id" value={r.id} />}
                <Field label={r ? "Name" : "New rate name"} name="name" defaultValue={r?.name} required />
                <div><label className="admin-label">Region</label><select name="region" defaultValue={r?.region ?? ""} className="admin-input"><option value="">All other regions</option>{PH_REGIONS.map((x) => <option key={x}>{x}</option>)}</select></div>
                <Field label="Fee (₱)" name="fee" defaultValue={r ? centavosToPesosInput(r.fee) : ""} required />
                <Field label="Free over (₱)" name="freeOverSubtotal" defaultValue={centavosToPesosInput(r?.freeOverSubtotal)} />
                <Check label="Active" name="isActive" defaultChecked={r?.isActive ?? true} />
                <button className="admin-btn">{r ? "Save" : "Add"}</button>
              </form>
              {r && <form action={deleteShippingRule}><input type="hidden" name="id" value={r.id} /><button className="admin-btn-ghost">Delete</button></form>}
            </div>
          ))}
        </div>
      </section>

      <section className="admin-card max-w-3xl">
        <h2 className="mb-3 text-[13px] font-medium">Team access</h2>
        <ul className="mb-4 space-y-1 text-[13px]">{staff.map((s) => <li key={s.id}>{s.email} · {s.role === "ADMIN" ? "Owner (full access)" : "Staff (no refunds, promotions or settings)"}{s.id === admin.id && " · you"}</li>)}</ul>
        <form action={saveStaff} className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" name="email" type="email" required />
          <Field label="Name (new accounts)" name="name" />
          <div><label className="admin-label">Role</label><select name="role" className="admin-input"><option value="STAFF">Staff</option><option value="ADMIN">Owner</option><option value="CUSTOMER">Remove access</option></select></div>
          <Field label="Temporary password (new accounts)" name="password" type="password" />
          <div className="sm:col-span-2"><button className="admin-btn">Save access</button></div>
        </form>
      </section>
    </div>
  );
}
