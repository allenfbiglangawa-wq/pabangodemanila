import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageTitle } from "@/components/admin/ui";

export default async function MovementLog({ searchParams }: { searchParams: Promise<{ sku?: string }> }) {
  const sp = await searchParams;
  const moves = await db.inventoryMovement.findMany({
    where: sp.sku ? { variant: { sku: sp.sku.toUpperCase() } } : {},
    include: { variant: { include: { product: { select: { name: true } } } }, admin: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageTitle title="Stock movement log" sub="Every change to on-hand or held stock, newest first." actions={<><a href="/admin/export/movements" className="admin-btn-ghost">Export CSV</a><Link href="/admin/inventory" className="admin-btn-ghost">Inventory</Link></>} />
      <form className="mb-5 flex max-w-sm gap-2"><input name="sku" defaultValue={sp.sku} placeholder="Filter by SKU" className="admin-input" /><button className="admin-btn">Filter</button></form>
      <div className="admin-card overflow-x-auto p-0">
        <table className="admin-table">
          <thead><tr><th>When</th><th>Product / SKU</th><th>Type</th><th className="text-right">On hand</th><th className="text-right">Held</th><th>Reason</th><th>By</th></tr></thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap">{formatDate(m.createdAt, { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{m.variant.product.name}<span className="block text-[11px] text-muted">{m.variant.sku}</span></td>
                <td>{m.type.toLowerCase()}</td>
                <td className="whitespace-nowrap text-right">{m.previousOnHand} → {m.newOnHand}</td>
                <td className="whitespace-nowrap text-right text-muted">{m.previousReserved} → {m.newReserved}</td>
                <td>{m.reason}</td>
                <td className="text-muted">{m.admin?.email ?? (m.orderId ? "order" : "system")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
