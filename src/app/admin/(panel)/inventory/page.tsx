import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { available } from "@/lib/inventory";
import { formatPHP } from "@/lib/money";
import { expireReservations } from "@/lib/orders";
import { adjustStock, importInventoryCsv } from "../../actions";
import { Flash, PageTitle } from "@/components/admin/ui";

export default async function InventoryAdmin({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const admin = await requireAdmin();
  await expireReservations();
  const variants = await db.productVariant.findMany({
    where: sp.q ? { OR: [{ sku: { contains: sp.q.toUpperCase() } }, { product: { name: { contains: sp.q } } }] } : {},
    include: { product: { select: { name: true, status: true, id: true } } },
    orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
  });
  let rows = variants.map((v) => ({ ...v, avail: available(v) }));
  if (sp.filter === "low") rows = rows.filter((v) => v.avail <= v.lowStockThreshold);
  if (sp.filter === "out") rows = rows.filter((v) => v.avail <= 0);
  const valuation = variants.reduce((s, v) => s + (v.cost ?? 0) * v.stockOnHand, 0);
  const missingCost = variants.filter((v) => v.cost == null && v.stockOnHand > 0).length;

  return (
    <>
      <Flash sp={sp} />
      <PageTitle
        title="Inventory"
        sub={<>Stock value at cost: <strong>{formatPHP(valuation)}</strong>{missingCost ? ` (${missingCost} variant(s) have no unit cost)` : ""} · Available = on hand − held for unpaid orders</>}
        actions={<><Link href="/admin/inventory/history" className="admin-btn-ghost">Movement log</Link><a href="/admin/export/inventory" className="admin-btn-ghost">Export CSV</a></>}
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form className="flex gap-2"><input name="q" defaultValue={sp.q} placeholder="SKU or product" className="admin-input" /><button className="admin-btn">Search</button></form>
        <Link href="/admin/inventory" className={`badge border border-line ${!sp.filter ? "bg-charcoal text-pearl" : ""}`}>All</Link>
        <Link href="/admin/inventory?filter=low" className={`badge border border-line ${sp.filter === "low" ? "bg-charcoal text-pearl" : ""}`}>Low stock</Link>
        <Link href="/admin/inventory?filter=out" className={`badge border border-line ${sp.filter === "out" ? "bg-charcoal text-pearl" : ""}`}>Out of stock</Link>
      </div>
      <div className="admin-card overflow-x-auto p-0">
        <table className="admin-table">
          <thead><tr><th>Product / SKU</th><th className="text-right">On hand</th><th className="text-right">Held</th><th className="text-right">Available</th><th className="text-right">Alert at</th><th className="text-right">Value</th><th>Adjust</th></tr></thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className={v.avail <= 0 ? "bg-red-50/40" : v.avail <= v.lowStockThreshold ? "bg-amber-50/40" : ""}>
                <td><Link href={`/admin/products/${v.product.id}`} className="hover:underline">{v.product.name}</Link><span className="block text-[11px] text-muted">{v.name} · {v.sku}{!v.isActive && " · inactive"}</span></td>
                <td className="text-right">{v.stockOnHand}</td>
                <td className="text-right text-muted">{v.stockReserved}</td>
                <td className="text-right font-medium">{v.avail}</td>
                <td className="text-right text-muted">{v.lowStockThreshold}</td>
                <td className="text-right">{v.cost != null ? formatPHP(v.cost * v.stockOnHand) : "—"}</td>
                <td>
                  <form action={adjustStock} className="flex flex-wrap gap-1.5">
                    <input type="hidden" name="variantId" value={v.id} />
                    <input type="hidden" name="back" value={`/admin/inventory${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`} />
                    <select name="mode" className="admin-input !w-24 !py-1 !text-[12px]" aria-label="Adjustment type"><option value="add">Restock +</option><option value="remove">Remove −</option><option value="set">Set to</option></select>
                    <input name="quantity" type="number" min={0} required className="admin-input !w-16 !py-1 !text-[12px]" aria-label="Quantity" />
                    <input name="reason" required placeholder="Reason" className="admin-input !w-36 !py-1 !text-[12px]" aria-label="Reason" />
                    <button className="admin-btn !px-3 !py-1">Apply</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {admin.role === "ADMIN" && (
        <section className="admin-card mt-6">
          <h2 className="mb-2 text-[13px] font-medium">Import stock from CSV</h2>
          <p className="mb-3 text-[12px] text-muted">Columns: <code>sku, on_hand</code>, optionally <code>low_stock_threshold, unit_cost</code>. Export first to get a ready template. Every change is recorded in the movement log.</p>
          <form action={importInventoryCsv} className="flex flex-wrap items-center gap-3">
            <input type="file" name="file" accept=".csv,text/csv" required className="text-[13px]" />
            <button className="admin-btn">Import</button>
          </form>
          <p className="mt-3 text-[11px] text-muted">Barcode field is stored per variant for future scanner support.</p>
        </section>
      )}
    </>
  );
}
