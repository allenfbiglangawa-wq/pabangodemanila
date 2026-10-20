import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { salesReport, parseRange } from "@/lib/analytics";
import { formatPHP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { expireReservations } from "@/lib/orders";
import { getSetting } from "@/lib/settings";
import { markNotificationsRead } from "../actions";
import { BarChart } from "@/components/admin/BarChart";
import { Flash, OrderBadge, PageTitle, Stat } from "@/components/admin/ui";

export default async function Overview({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; denied?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  await expireReservations(); // keep reservations honest even without a cron job

  const month = parseRange({ range: "mtd" });
  const year = parseRange({ range: "365d" });
  const [mtd, trailing, totals, pendingOrders, completed, customers, lowStock, inquiries, notes, recent, placeholders, shippingRules, story, policies] = await Promise.all([
    salesReport(month.from, month.to, "day"),
    salesReport(year.from, year.to, "month"),
    db.order.aggregate({ where: { status: { in: ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED", "REFUNDED"] } }, _sum: { total: true, refundedTotal: true }, _count: true }),
    db.order.count({ where: { status: { in: ["PENDING_PAYMENT", "PAYMENT_UNDER_REVIEW", "PAID", "PROCESSING", "PACKED"] } } }),
    db.order.count({ where: { status: { in: ["DELIVERED", "COMPLETED"] } } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.$queryRaw<{ id: string; sku: string; name: string; product: string; available: number; threshold: number }[]>`
      SELECT v."id", v."sku", v."name", p."name" AS product, (v."stockOnHand" - v."stockReserved") AS available, v."lowStockThreshold" AS threshold
      FROM "ProductVariant" v JOIN "Product" p ON p."id" = v."productId"
      WHERE v."isActive" = true AND p."status" = 'ACTIVE' AND (v."stockOnHand" - v."stockReserved") <= v."lowStockThreshold"
      ORDER BY available ASC LIMIT 8`,
    db.eventInquiry.count({ where: { status: { in: ["INQUIRY_RECEIVED", "REVIEWING"] } } }),
    db.adminNotification.findMany({ where: { readAt: null }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.product.count({ where: { isPlaceholder: true, status: "ACTIVE" } }),
    db.shippingRule.findMany(),
    getSetting("story"),
    getSetting("policies"),
  ]);

  const noPhotos = await db.product.count({ where: { status: "ACTIVE", images: { every: { url: { startsWith: "/placeholders/" } } } } });
  // Variants still on seeded demo stock: a demo movement and no real count entered since.
  const zeroStockSeeded = await db.productVariant.count({
    where: {
      movements: { some: { reason: { startsWith: "DEMO stock" } } },
      NOT: { movements: { some: { type: { in: ["ADJUSTMENT", "RESTOCK", "IMPORT"] }, NOT: { reason: { startsWith: "DEMO stock" } } } } },
    },
  });
  const setup = [
    { done: placeholders === 0, label: `Replace ${placeholders} sample product(s) with your real catalog`, href: "/admin/products" },
    { done: noPhotos === 0, label: `Add real photos to ${noPhotos} product(s) still using placeholder images`, href: "/admin/products" },
    { done: zeroStockSeeded === 0, label: "Enter real stock counts (some products still have seeded demo stock)", href: "/admin/inventory" },
    { done: process.env.PAYMENT_PROVIDER && process.env.PAYMENT_PROVIDER !== "stub", label: "Choose and connect a payment provider (PayMongo, Xendit…)", href: "/admin/settings" },
    { done: shippingRules.some((r) => r.isActive && !r.name.startsWith("PLACEHOLDER")), label: "Set your shipping rates", href: "/admin/settings" },
    { done: !story.isPlaceholder, label: "Write your brand story", href: "/admin/content?tab=story" },
    { done: Boolean(policies.shipping && policies.returns && policies.privacy && policies.terms), label: "Publish shipping, returns, privacy and terms policies", href: "/admin/content?tab=policies" },
  ];

  return (
    <div className="space-y-8">
      <Flash sp={sp.denied ? { error: "That area is limited to the owner account." } : sp} />
      <PageTitle title="Overview" sub="Figures come from verified orders in your database. Pending and cancelled orders are excluded from sales." />

      {setup.some((s) => !s.done) && (
        <section className="admin-card border-champagne/60 bg-[#fdfbf6]">
          <h2 className="text-[13px] font-medium">Before launch</h2>
          <ul className="mt-3 space-y-1.5 text-[13px]">
            {setup.map((s) => (
              <li key={s.label} className={s.done ? "text-muted line-through" : ""}>
                {s.done ? "✓" : "○"} <Link href={s.href} className="hover:underline">{s.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total sales (all time)" value={formatPHP((totals._sum.total ?? 0) - (totals._sum.refundedTotal ?? 0))} hint={`${totals._count} paid orders, after refunds`} />
        <Stat label="Net sales · month to date" value={formatPHP(mtd.netSales)} hint={`Gross ${formatPHP(mtd.grossSales)}`} href="/admin/analytics?range=mtd" />
        <Stat label="Orders · month to date" value={String(mtd.orders)} hint={`Avg. order ${formatPHP(mtd.aov)}`} />
        <Stat label="Open orders" value={String(pendingOrders)} hint={`${completed} delivered / completed`} href="/admin/orders?status=open" />
        <Stat label="Customers (accounts)" value={String(customers)} href="/admin/customers" />
        <Stat label="Event inquiries to review" value={String(inquiries)} href="/admin/events" />
        <Stat label="Low-stock variants" value={String(lowStock.length)} href="/admin/inventory?filter=low" />
        <Stat label="Est. gross profit · MTD" value={formatPHP(mtd.grossProfit)} hint={mtd.cogsMissingItems ? `${mtd.cogsMissingItems} line(s) missing unit cost` : undefined} href="/admin/analytics?range=mtd" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="admin-card">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[13px] font-medium">Monthly revenue · last 12 months</h2>
            <Link href="/admin/analytics" className="text-[12px] underline">Full analytics</Link>
          </div>
          <BarChart data={trailing.series.map((s) => ({ key: s.key, value: s.revenue }))} label="Revenue" />
        </section>
        <section className="admin-card">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[13px] font-medium">Notifications</h2>
            {notes.length > 0 && <form action={markNotificationsRead}><button className="text-[12px] underline">Mark all read</button></form>}
          </div>
          {notes.length === 0 ? <p className="text-[13px] text-muted">You’re all caught up.</p> : (
            <ul className="divide-y divide-line text-[13px]">
              {notes.map((n) => (
                <li key={n.id} className="py-2.5">
                  {n.link ? <Link href={n.link} className="hover:underline">{n.message}</Link> : n.message}
                  <span className="block text-[11px] text-muted">{formatDate(n.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="admin-card xl:col-span-1">
          <h2 className="mb-3 text-[13px] font-medium">Bestsellers · month to date</h2>
          {mtd.byProduct.length === 0 ? <p className="text-[13px] text-muted">No sales yet this month.</p> : (
            <table className="admin-table"><tbody>{mtd.byProduct.slice(0, 6).map((p) => <tr key={p.name}><td>{p.name}</td><td className="text-right">{p.quantity}</td><td className="text-right">{formatPHP(p.sales)}</td></tr>)}</tbody></table>
          )}
        </section>
        <section className="admin-card">
          <h2 className="mb-3 text-[13px] font-medium">Low stock</h2>
          {lowStock.length === 0 ? <p className="text-[13px] text-muted">All variants are above their thresholds.</p> : (
            <table className="admin-table"><tbody>{lowStock.map((v) => <tr key={v.id}><td><Link href={`/admin/inventory?q=${v.sku}`} className="hover:underline">{v.product}</Link><span className="block text-[11px] text-muted">{v.name} · {v.sku}</span></td><td className={`text-right ${Number(v.available) <= 0 ? "text-red-700" : ""}`}>{Number(v.available)} left</td></tr>)}</tbody></table>
          )}
        </section>
        <section className="admin-card">
          <h2 className="mb-3 text-[13px] font-medium">Recent orders</h2>
          {recent.length === 0 ? <p className="text-[13px] text-muted">No orders yet.</p> : (
            <table className="admin-table"><tbody>{recent.map((o) => <tr key={o.id}><td><Link href={`/admin/orders/${o.number}`} className="hover:underline">{o.number}</Link><span className="block text-[11px] text-muted">{o.fullName}</span></td><td><OrderBadge status={o.status} /></td><td className="text-right">{formatPHP(o.total)}</td></tr>)}</tbody></table>
          )}
        </section>
      </div>
    </div>
  );
}
