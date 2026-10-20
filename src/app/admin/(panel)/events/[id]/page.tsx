import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { centavosToPesosInput, formatPHP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { EVENT_STATUS_LABEL, EVENT_TRANSITIONS, type EventStatus } from "@/lib/constants";
import { addEventNote, saveEventQuote, updateEventStatus } from "../../../actions";
import { Check, EventBadge, Field, Flash, PageTitle } from "@/components/admin/ui";

export default async function EventDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const e = await db.eventInquiry.findUnique({ where: { id }, include: { notes: { orderBy: { createdAt: "desc" } } } });
  if (!e) notFound();
  const next = EVENT_TRANSITIONS[e.status as EventStatus] ?? [];
  const balance = e.quotationAmount ? Math.max(0, e.quotationAmount - e.depositPaid - e.balancePaid) : null;
  const rows: [string, React.ReactNode][] = [
    ["Client", <>{e.fullName}<br /><a href={`mailto:${e.email}`} className="underline">{e.email}</a> · {e.phone}</>],
    ["Event", `${e.eventType} on ${formatDate(e.eventDate, { dateStyle: "full" })}`],
    ["Venue", e.venue],
    ["Guests", e.guestCount ?? "—"],
    ["Venue size", e.venueSize ?? "—"],
    ["Fragrance style", e.fragranceStyle ?? "—"],
    ["Budget", e.budgetRange ?? "—"],
    ["Requirements", <span key="r" className="whitespace-pre-line">{e.requirements ?? "—"}</span>],
  ];

  return (
    <div className="space-y-6">
      <Flash sp={sp} />
      <PageTitle title={`Inquiry ${e.reference}`} sub={<>Received {formatDate(e.createdAt, { dateStyle: "long", timeStyle: "short" })} · <EventBadge status={e.status} /></>} actions={<Link href="/admin/events" className="admin-btn-ghost">All bookings</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="admin-card"><dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-[140px_1fr]">{rows.map(([k, v]) => <Fragment key={k}><dt className="text-muted">{k}</dt><dd>{v}</dd></Fragment>)}</dl></section>
          <section className="admin-card">
            <h2 className="mb-3 text-[13px] font-medium">Quotation & payments</h2>
            <form action={saveEventQuote} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={e.id} />
              <Field label="Quotation (₱)" name="quotationAmount" defaultValue={centavosToPesosInput(e.quotationAmount)} inputMode="decimal" />
              <Field label="Deposit required (₱)" name="depositRequired" defaultValue={centavosToPesosInput(e.depositRequired)} inputMode="decimal" />
              <Field label="Deposit received (₱)" name="depositPaid" defaultValue={centavosToPesosInput(e.depositPaid)} inputMode="decimal" hint="Record only after the money is verified." />
              <Field label="Balance received (₱)" name="balancePaid" defaultValue={centavosToPesosInput(e.balancePaid)} inputMode="decimal" />
              <div className="sm:col-span-2 flex items-center justify-between"><button className="admin-btn">Save</button>{balance != null && <p className="text-[13px]">Balance due: <strong>{formatPHP(balance)}</strong></p>}</div>
            </form>
          </section>
          <section className="admin-card">
            <h2 className="mb-3 text-[13px] font-medium">Workflow</h2>
            <p className="mb-3 text-[12px] text-muted">Inquiry Received → Reviewing → Quotation Sent → Client Accepted → Deposit Pending → Confirmed → Event Completed</p>
            {next.length === 0 ? <p className="text-[13px] text-muted">This booking is closed.</p> : (
              <form action={updateEventStatus} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={e.id} />
                <div><label className="admin-label" htmlFor="to">Move to</label><select id="to" name="to" className="admin-input">{next.map((s) => <option key={s} value={s}>{EVENT_STATUS_LABEL[s]}</option>)}</select></div>
                <Field label="Message / note (optional)" name="note" />
                <Check label="Email the client about this change" name="notify" defaultChecked />
                <div className="sm:col-span-2"><button className="admin-btn">Update</button></div>
              </form>
            )}
          </section>
        </div>
        <section className="admin-card">
          <h2 className="mb-3 text-[13px] font-medium">Internal notes</h2>
          <form action={addEventNote} className="mb-4 space-y-2"><input type="hidden" name="id" value={e.id} /><textarea name="body" rows={3} className="admin-input" placeholder="Visible to staff only" /><button className="admin-btn-ghost">Add note</button></form>
          <ul className="space-y-3 text-[13px]">{e.notes.map((n) => <li key={n.id} className="border-l-2 border-line pl-3"><p className="whitespace-pre-line">{n.body}</p><p className="text-[11px] text-muted">{n.author} · {formatDate(n.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p></li>)}</ul>
        </section>
      </div>
    </div>
  );
}
