import Link from "next/link";
import { db } from "@/lib/db";
import { formatPHP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { EVENT_STATUSES, EVENT_STATUS_LABEL } from "@/lib/constants";
import { manilaDate } from "@/lib/analytics";
import { EventBadge, PageTitle } from "@/components/admin/ui";

export default async function EventsAdmin({ searchParams }: { searchParams: Promise<{ status?: string; month?: string; view?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "calendar" ? "calendar" : "list";
  const inquiries = await db.eventInquiry.findMany({
    where: sp.status ? { status: sp.status } : {},
    orderBy: view === "calendar" ? { eventDate: "asc" } : { createdAt: "desc" },
  });

  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : manilaDate(new Date()).slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const byDay = new Map<string, typeof inquiries>();
  for (const i of inquiries) {
    const k = manilaDate(i.eventDate);
    if (!k.startsWith(month)) continue;
    byDay.set(k, [...(byDay.get(k) ?? []), i]);
  }

  return (
    <>
      <PageTitle title="Event Bookings" sub="Inquiries never become bookings automatically. Confirm only after the client accepts and the deposit is verified." actions={<><Link href="/admin/events?view=list" className={view === "list" ? "admin-btn" : "admin-btn-ghost"}>List</Link><Link href="/admin/events?view=calendar" className={view === "calendar" ? "admin-btn" : "admin-btn-ghost"}>Calendar</Link><a href="/admin/export/events" className="admin-btn-ghost">Export CSV</a></>} />
      <div className="mb-5 flex flex-wrap gap-1.5 text-[12px]">
        <Link href={`/admin/events?view=${view}`} className={`badge border border-line ${!sp.status ? "bg-charcoal text-pearl" : ""}`}>All</Link>
        {EVENT_STATUSES.map((s) => <Link key={s} href={`/admin/events?view=${view}&status=${s}`} className={`badge border border-line ${sp.status === s ? "bg-charcoal text-pearl" : ""}`}>{EVENT_STATUS_LABEL[s]}</Link>)}
      </div>

      {view === "calendar" ? (
        <section className="admin-card">
          <div className="mb-4 flex items-center justify-between">
            <Link href={`/admin/events?view=calendar&month=${prev}`} className="admin-btn-ghost">←</Link>
            <h2 className="font-serif text-2xl">{new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" }).format(first)}</h2>
            <Link href={`/admin/events?view=calendar&month=${next}`} className="admin-btn-ghost">→</Link>
          </div>
          <div className="grid grid-cols-7 gap-px bg-line text-[12px]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-ivory p-2 text-center text-muted">{d}</div>)}
            {Array.from({ length: lead }, (_, i) => <div key={`l${i}`} className="min-h-24 bg-pearl" />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const key = `${month}-${String(i + 1).padStart(2, "0")}`;
              return (
                <div key={key} className="min-h-24 bg-pearl p-1.5">
                  <p className="text-muted">{i + 1}</p>
                  {(byDay.get(key) ?? []).map((e) => (
                    <Link key={e.id} href={`/admin/events/${e.id}`} className={`mt-1 block truncate rounded-sm px-1.5 py-0.5 ${e.status === "CONFIRMED" ? "bg-emerald-100" : e.status === "DECLINED" ? "bg-stone-100 line-through" : "bg-amber-50"}`}>{e.eventType} · {e.fullName}</Link>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="admin-card overflow-x-auto p-0">
          <table className="admin-table">
            <thead><tr><th>Ref</th><th>Client</th><th>Event</th><th>Event date</th><th>Status</th><th className="text-right">Quote</th><th className="text-right">Balance due</th></tr></thead>
            <tbody>
              {inquiries.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted">No inquiries yet.</td></tr>}
              {inquiries.map((e) => (
                <tr key={e.id}>
                  <td><Link href={`/admin/events/${e.id}`} className="font-medium hover:underline">{e.reference}</Link><span className="block text-[11px] text-muted">{formatDate(e.createdAt)}</span></td>
                  <td>{e.fullName}<span className="block text-[11px] text-muted">{e.email}</span></td>
                  <td>{e.eventType}<span className="block text-[11px] text-muted">{e.venue}</span></td>
                  <td>{formatDate(e.eventDate, { dateStyle: "medium" })}</td>
                  <td><EventBadge status={e.status} /></td>
                  <td className="text-right">{e.quotationAmount ? formatPHP(e.quotationAmount) : "—"}</td>
                  <td className="text-right">{e.quotationAmount ? formatPHP(Math.max(0, e.quotationAmount - e.depositPaid - e.balancePaid)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
