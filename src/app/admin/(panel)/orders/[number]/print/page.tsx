import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/admin/PrintButton";

export default async function PackingSlip({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const o = await db.order.findUnique({ where: { number }, include: { items: true } });
  if (!o) notFound();
  return (
    <div className="mx-auto max-w-2xl bg-pearl p-10 text-[13px]">
      <div className="no-print mb-6"><PrintButton /></div>
      <p className="font-serif text-2xl tracking-[0.24em]">PABANGO DE MANILA</p>
      <h1 className="mt-6 text-lg font-medium">Packing slip · {o.number}</h1>
      <p className="text-muted">{formatDate(o.createdAt, { dateStyle: "long" })}</p>
      <p className="mt-6">{o.fullName}<br />{o.line1}{o.line2 && `, ${o.line2}`}<br />Brgy. {o.barangay}, {o.city}<br />{o.province} {o.postalCode}<br />{o.phone}</p>
      <table className="admin-table mt-8"><thead><tr><th>Item</th><th>SKU</th><th className="text-right">Qty</th></tr></thead>
        <tbody>{o.items.map((i) => <tr key={i.id}><td>{i.productName} — {i.variantName}</td><td>{i.sku}</td><td className="text-right">{i.quantity}</td></tr>)}</tbody>
      </table>
      {o.notes && <p className="mt-6"><strong>Notes:</strong> {o.notes}</p>}
    </div>
  );
}
