import Link from "next/link";
import { salesReport, parseRange, type Granularity } from "@/lib/analytics";
import { formatPHP } from "@/lib/money";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { BarChart } from "@/components/admin/BarChart";
import { PageTitle, Stat } from "@/components/admin/ui";
import { PrintButton } from "@/components/admin/PrintButton";

export default async function Analytics({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; g?: string }> }) {
  const sp = await searchParams;
  const { from, to, label } = parseRange(sp);
  const days = (to.getTime() - from.getTime()) / 86400_000;
  const g = (["day", "week", "month", "year"].includes(sp.g ?? "") ? sp.g : days > 120 ? "month" : days > 45 ? "week" : "day") as Granularity;
  const r = await salesReport(from, to, g);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  const presets = [["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"], ["mtd", "Month to date"], ["ytd", "Year to date"], ["365d", "12 months"]];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Sales Analytics"
        sub={`${label} · Asia/Manila time · paid orders only`}
        actions={<div className="no-print flex flex-wrap gap-2"><a href={`/admin/export/sales?${qs}`} className="admin-btn-ghost">CSV</a><a href={`/admin/export/sales?${qs}&format=xlsx`} className="admin-btn-ghost">Excel</a><PrintButton label="Print / PDF" /></div>}
      />
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5">
          {presets.map(([k, l]) => <Link key={k} href={`/admin/analytics?range=${k}`} className={`badge border border-line ${sp.range === k || (!sp.range && !sp.from && k === "30d") ? "bg-charcoal text-pearl" : "bg-pearl"}`}>{l}</Link>)}
        </div>
        <form className="flex flex-wrap items-end gap-2 text-[12px]">
          <label>From <input type="date" name="from" defaultValue={sp.from} className="admin-input !py-1" /></label>
          <label>To <input type="date" name="to" defaultValue={sp.to} className="admin-input !py-1" /></label>
          <label>Group by <select name="g" defaultValue={g} className="admin-input !py-1"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></label>
          <button className="admin-btn !py-1.5">Apply</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Gross sales" value={formatPHP(r.grossSales)} hint="Item value before discounts and refunds" />
        <Stat label="Net sales" value={formatPHP(r.netSales)} hint="Gross − discounts − refunds" />
        <Stat label="Revenue" value={formatPHP(r.revenue)} hint="Net sales + shipping collected" />
        <Stat label="Estimated gross profit" value={formatPHP(r.grossProfit)} hint="Net sales − cost of goods − fees − shipping costs + shipping collected" />
        <Stat label="Orders" value={String(r.orders)} />
        <Stat label="Average order value" value={formatPHP(r.aov)} />
        <Stat label="Discounts" value={formatPHP(r.discounts)} />
        <Stat label="Refunds" value={formatPHP(r.refunds)} />
        <Stat label="Shipping collected" value={formatPHP(r.shippingCollected)} />
        <Stat label="Shipping costs" value={formatPHP(r.shippingCosts)} hint="Entered per order" />
        <Stat label="Payment fees" value={formatPHP(r.paymentFees)} hint={r.paymentFeesEstimated ? "Includes estimates (Settings)" : "As reported by provider"} />
        <Stat label="Cost of goods sold" value={formatPHP(r.cogs)} hint={r.cogsMissingItems ? `${r.cogsMissingItems} line(s) without unit cost` : undefined} />
      </div>

      <section className="admin-card">
        <h2 className="mb-4 text-[13px] font-medium">Revenue by {g}</h2>
        <BarChart data={r.series.map((s) => ({ key: s.key, value: s.revenue }))} label="Revenue" />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {[
          ["Sales by product", r.byProduct.map((p) => [p.name, p.quantity, p.sales] as const)],
          ["Sales by category", r.byCategory.map((p) => [p.name, p.quantity, p.sales] as const)],
          ["By payment method", r.byPayment.map((p) => [PAYMENT_METHODS[p.method as PaymentMethod] ?? p.method, p.orders, p.total] as const)],
        ].map(([title, rows]) => (
          <section key={title as string} className="admin-card">
            <h2 className="mb-3 text-[13px] font-medium">{title as string}</h2>
            {(rows as readonly (readonly [string, number, number])[]).length === 0 ? <p className="text-[13px] text-muted">No sales in this period.</p> : (
              <table className="admin-table"><thead><tr><th></th><th className="text-right">{title === "By payment method" ? "Orders" : "Units"}</th><th className="text-right">Sales</th></tr></thead>
                <tbody>{(rows as readonly (readonly [string, number, number])[]).map(([n, q, s]) => <tr key={n}><td>{n}</td><td className="text-right">{q}</td><td className="text-right">{formatPHP(s)}</td></tr>)}</tbody>
              </table>
            )}
          </section>
        ))}
      </div>
      <p className="text-[12px] text-muted">Conversion metrics (visits → orders) will appear once privacy-compliant analytics tracking is connected.</p>
    </div>
  );
}
