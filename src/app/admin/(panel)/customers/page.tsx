import Link from "next/link";
import { db } from "@/lib/db";
import { formatPHP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { SALE_STATUSES } from "@/lib/constants";
import { markMessageHandled, processDeletion } from "../../actions";
import { Flash, PageTitle } from "@/components/admin/ui";

export default async function CustomersAdmin({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "customers";
  const tabs = [["customers", "Customers"], ["messages", "Messages"], ["subscribers", "Newsletter"]];
  const nav = (
    <div className="mb-6 flex gap-4 border-b border-line text-[13px]">
      {tabs.map(([k, l]) => <Link key={k} href={`/admin/customers?tab=${k}`} className={`pb-2 ${tab === k ? "border-b-2 border-charcoal" : "text-muted"}`}>{l}</Link>)}
    </div>
  );

  if (tab === "messages") {
    const msgs = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return (
      <>
        <Flash sp={sp} /><PageTitle title="Messages" sub="From the contact form." />{nav}
        <div className="space-y-3">
          {msgs.length === 0 && <p className="text-[13px] text-muted">No messages yet.</p>}
          {msgs.map((m) => (
            <div key={m.id} className={`admin-card text-[13px] ${m.handled ? "opacity-60" : ""}`}>
              <div className="flex justify-between gap-4"><p className="font-medium">{m.subject}</p><span className="text-muted">{formatDate(m.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span></div>
              <p className="text-muted">{m.name} · <a href={`mailto:${m.email}`} className="underline">{m.email}</a></p>
              <p className="mt-2 whitespace-pre-line">{m.message}</p>
              {!m.handled && <form action={markMessageHandled} className="mt-3"><input type="hidden" name="id" value={m.id} /><button className="admin-btn-ghost">Mark handled</button></form>}
            </div>
          ))}
        </div>
      </>
    );
  }

  if (tab === "subscribers") {
    const subs = await db.newsletterSubscriber.findMany({ orderBy: { consentAt: "desc" } });
    const active = subs.filter((s) => s.status === "SUBSCRIBED").length;
    return (
      <>
        <PageTitle title="Newsletter" sub={`${active} subscribed · consent text and time are stored for each subscriber`} actions={<a href="/admin/export/subscribers" className="admin-btn-ghost">Export subscribed (CSV)</a>} />{nav}
        <div className="admin-card overflow-x-auto p-0">
          <table className="admin-table"><thead><tr><th>Email</th><th>Status</th><th>Consented</th><th>Source</th></tr></thead>
            <tbody>{subs.map((s) => <tr key={s.id}><td>{s.email}</td><td>{s.status.toLowerCase()}</td><td>{formatDate(s.consentAt)}</td><td>{s.source}</td></tr>)}</tbody>
          </table>
        </div>
      </>
    );
  }

  const users = await db.user.findMany({
    where: { role: "CUSTOMER", ...(sp.q ? { OR: [{ email: { contains: sp.q.toLowerCase() } }, { name: { contains: sp.q } }] } : {}) },
    include: { orders: { where: { status: { in: SALE_STATUSES } }, select: { total: true, refundedTotal: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });
  const guests = await db.order.groupBy({ by: ["email"], where: { userId: null, status: { in: SALE_STATUSES } }, _count: true, _sum: { total: true } });
  const deletion = users.filter((u) => u.deletionRequestedAt);

  return (
    <>
      <Flash sp={sp} />
      <PageTitle title="Customers" sub={`${users.length} account(s) · ${guests.length} guest buyer(s)`} actions={<a href="/admin/export/customers" className="admin-btn-ghost">Export CSV</a>} />
      {nav}
      {deletion.length > 0 && (
        <section className="admin-card mb-6 border-amber-200 bg-amber-50/50">
          <h2 className="mb-2 text-[13px] font-medium">Account deletion requests</h2>
          {deletion.map((u) => (
            <form key={u.id} action={processDeletion} className="flex items-center justify-between gap-4 py-1 text-[13px]">
              <input type="hidden" name="id" value={u.id} />
              <span>{u.email} · requested {formatDate(u.deletionRequestedAt)}</span>
              <button className="admin-btn">Delete account data</button>
            </form>
          ))}
          <p className="mt-2 text-[11px] text-muted">Order records are kept (detached from the account) for accounting and tax purposes.</p>
        </section>
      )}
      <form className="mb-5 flex max-w-sm gap-2"><input name="q" defaultValue={sp.q} placeholder="Name or email" className="admin-input" /><button className="admin-btn">Search</button></form>
      <div className="admin-card overflow-x-auto p-0">
        <table className="admin-table">
          <thead><tr><th>Customer</th><th>Joined</th><th className="text-right">Orders</th><th className="text-right">Spent</th><th>Marketing</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}<span className="block text-[11px] text-muted">{u.email}{u.phone && ` · ${u.phone}`}</span></td>
                <td>{formatDate(u.createdAt)}</td>
                <td className="text-right"><Link href={`/admin/orders?q=${encodeURIComponent(u.email)}`} className="underline">{u.orders.length}</Link></td>
                <td className="text-right">{formatPHP(u.orders.reduce((s, o) => s + o.total - o.refundedTotal, 0))}</td>
                <td>{u.marketingConsent ? "Opted in" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
