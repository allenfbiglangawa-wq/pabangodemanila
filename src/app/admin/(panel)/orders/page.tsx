import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatPHP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { expireReservations } from "@/lib/orders";
import { OrderBadge, PageTitle } from "@/components/admin/ui";

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  await expireReservations();
  const where: Prisma.OrderWhereInput = {};
  if (sp.status === "open") where.status = { in: ["PENDING_PAYMENT", "PAYMENT_UNDER_REVIEW", "PAID", "PROCESSING", "PACKED"] };
  else if (sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status)) where.status = sp.status;
  if (sp.q) where.OR = [{ number: { contains: sp.q.toUpperCase() } }, { email: { contains: sp.q.toLowerCase() } }, { fullName: { contains: sp.q } }, { phone: { contains: sp.q } }];
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const [orders, count, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const qs = (patch: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageTitle title="Orders" sub={`${count} order(s)`} actions={<a href={`/admin/export/orders${qs({ page: undefined })}`} className="admin-btn-ghost">Export CSV</a>} />
      <div className="mb-5 flex flex-wrap gap-2 text-[12px]">
        <Link href="/admin/orders" className={`badge ${!sp.status ? "bg-charcoal text-pearl" : "bg-pearl border border-line"}`}>All</Link>
        <Link href={qs({ status: "open", page: undefined })} className={`badge ${sp.status === "open" ? "bg-charcoal text-pearl" : "bg-pearl border border-line"}`}>Open</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={qs({ status: s, page: undefined })} className={`badge ${sp.status === s ? "bg-charcoal text-pearl" : "bg-pearl border border-line"}`}>
            {ORDER_STATUS_LABEL[s]} {countOf[s] ? `(${countOf[s]})` : ""}
          </Link>
        ))}
      </div>
      <form className="mb-5 flex max-w-md gap-2">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={sp.q} placeholder="Order no., name, email, phone" className="admin-input" />
        <button className="admin-btn">Search</button>
      </form>
      <div className="admin-card overflow-x-auto p-0">
        <table className="admin-table">
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Status</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted">No orders found.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.number}`} className="font-medium hover:underline">{o.number}</Link><span className="block text-[11px] text-muted">{o._count.items} item(s)</span></td>
                <td>{formatDate(o.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                <td>{o.fullName}<span className="block text-[11px] text-muted">{o.email}</span></td>
                <td>{PAYMENT_METHODS[o.paymentMethod as PaymentMethod]}</td>
                <td><OrderBadge status={o.status} /></td>
                <td className="text-right">{formatPHP(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {count > 50 && (
        <div className="mt-4 flex gap-3 text-[13px]">
          {page > 1 && <Link href={qs({ page: String(page - 1) })} className="underline">Previous</Link>}
          {page * 50 < count && <Link href={qs({ page: String(page + 1) })} className="underline">Next</Link>}
        </div>
      )}
    </>
  );
}
