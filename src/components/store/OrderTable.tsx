import Link from "next/link";
import { formatPHP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/constants";

export function OrderTable({ orders }: { orders: { id: string; number: string; createdAt: Date; status: string; total: number }[] }) {
  if (!orders.length) return <p className="text-muted">No orders yet. <Link href="/shop" className="underline">Start shopping</Link></p>;
  return (
    <table className="w-full text-[14px]">
      <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.16em] text-muted"><th className="py-3">Order</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr></thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} className="border-b border-line">
            <td className="py-4"><Link href={`/order/${o.number}`} className="underline">{o.number}</Link></td>
            <td>{formatDate(o.createdAt)}</td>
            <td>{ORDER_STATUS_LABEL[o.status as OrderStatus]}</td>
            <td className="text-right">{formatPHP(o.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
