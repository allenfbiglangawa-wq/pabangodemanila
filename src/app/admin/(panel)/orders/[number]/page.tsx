import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatPHP, centavosToPesosInput } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_TRANSITIONS, PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from "@/lib/constants";
import { refundOrderAction, saveOrderShipping, updateOrderStatus } from "../../../actions";
import { Field, Flash, OrderBadge, PageTitle } from "@/components/admin/ui";

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ number }, sp, admin] = await Promise.all([params, searchParams, requireAdmin()]);
  const o = await db.order.findUnique({ where: { number }, include: { items: true, payments: true, refunds: true, history: { orderBy: { createdAt: "asc" } }, user: true } });
  if (!o) notFound();
  const status = o.status as OrderStatus;
  const next = ORDER_TRANSITIONS[status].filter((s) => s !== "REFUNDED" && !(s === "PAID" && o.paymentMethod !== "BANK_TRANSFER") && !(s === "PROCESSING" && status === "PENDING_PAYMENT" && o.paymentMethod !== "COD"));
  const refundable = o.total - o.refundedTotal;
  const canRefund = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"].includes(status) && refundable > 0;

  return (
    <div className="space-y-6">
      <Flash sp={sp} />
      <PageTitle
        title={`Order ${o.number}`}
        sub={<>Placed {formatDate(o.createdAt, { dateStyle: "long", timeStyle: "short" })} · <OrderBadge status={o.status} /></>}
        actions={<><Link href={`/admin/orders/${o.number}/print`} className="admin-btn-ghost">Packing slip</Link><Link href="/admin/orders" className="admin-btn-ghost">All orders</Link></>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="admin-card overflow-x-auto p-0">
            <table className="admin-table">
              <thead><tr><th>Item</th><th>SKU</th><th className="text-right">Price</th><th className="text-right">Qty</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.productName}<span className="block text-[11px] text-muted">{i.variantName}{i.refundedQuantity ? ` · ${i.refundedQuantity} returned` : ""}</span></td>
                    <td>{i.sku}</td>
                    <td className="text-right">{formatPHP(i.unitPrice)}</td>
                    <td className="text-right">{i.quantity}</td>
                    <td className="text-right">{formatPHP(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-[13px]">
                <tr><td colSpan={4} className="text-right">Subtotal</td><td className="text-right">{formatPHP(o.subtotal)}</td></tr>
                {o.discountTotal > 0 && <tr><td colSpan={4} className="text-right">Discount {o.discountCode}</td><td className="text-right">−{formatPHP(o.discountTotal)}</td></tr>}
                <tr><td colSpan={4} className="text-right">Shipping</td><td className="text-right">{formatPHP(o.shippingFee)}</td></tr>
                <tr><td colSpan={4} className="text-right font-medium">Total</td><td className="text-right font-medium">{formatPHP(o.total)}</td></tr>
                {o.refundedTotal > 0 && <tr><td colSpan={4} className="text-right">Refunded</td><td className="text-right text-red-700">−{formatPHP(o.refundedTotal)}</td></tr>}
              </tfoot>
            </table>
          </section>

          <section className="admin-card">
            <h2 className="mb-3 text-[13px] font-medium">Update status</h2>
            {next.length === 0 ? <p className="text-[13px] text-muted">No further status changes are available.</p> : (
              <form action={updateOrderStatus} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="number" value={o.number} />
                <div>
                  <label className="admin-label" htmlFor="to">Move to</label>
                  <select id="to" name="to" className="admin-input">{next.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select>
                </div>
                <Field label="Note (optional)" name="note" />
                <Field label="Courier (for Shipped)" name="courier" defaultValue={o.courier} />
                <Field label="Tracking number (for Shipped)" name="trackingNumber" defaultValue={o.trackingNumber} />
                <div className="sm:col-span-2"><button className="admin-btn">Update status</button></div>
              </form>
            )}
            {status === "PAYMENT_UNDER_REVIEW" && o.paymentMethod === "BANK_TRANSFER" && (
              <p className="mt-3 rounded-sm bg-amber-50 p-3 text-[12px] text-amber-900">Customer reference: <strong>{o.bankTransferRef ?? "—"}</strong>. Check that {formatPHP(o.total)} has arrived in your bank account before marking this order Paid.</p>
            )}
            {["GCASH", "MAYA", "CARD"].includes(o.paymentMethod) && status === "PENDING_PAYMENT" && (
              <p className="mt-3 text-[12px] text-muted">Online payments are marked Paid automatically once the payment provider confirms them. Unpaid orders are cancelled and their stock released when the hold expires ({formatDate(o.reservationExpiresAt, { dateStyle: "medium", timeStyle: "short" })}).</p>
            )}
          </section>

          {canRefund && admin.role === "ADMIN" && (
            <section className="admin-card">
              <h2 className="mb-3 text-[13px] font-medium">Refund / return</h2>
              <form action={refundOrderAction} className="space-y-3">
                <input type="hidden" name="number" value={o.number} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={`Amount (₱, up to ${formatPHP(refundable)})`} name="amount" defaultValue={centavosToPesosInput(refundable)} required inputMode="decimal" />
                  <Field label="Reason" name="reason" required />
                </div>
                <p className="text-[12px] text-muted">Return items to stock (leave 0 if the items are not coming back or are damaged):</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {o.items.map((i) => (
                    <label key={i.id} className="flex items-center justify-between gap-3 text-[13px]">
                      <span>{i.productName} ({i.variantName})</span>
                      <input type="number" name={`restock_${i.id}`} min={0} max={i.quantity - i.refundedQuantity} defaultValue={0} className="admin-input !w-20" />
                    </label>
                  ))}
                </div>
                <button className="admin-btn">Record refund</button>
                <p className="text-[11px] text-muted">This records the refund and updates stock and reports. Send the money back through your payment provider or bank.</p>
              </form>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="admin-card text-[13px] leading-relaxed">
            <h2 className="mb-2 font-medium">Customer</h2>
            <p>{o.fullName}<br /><a href={`mailto:${o.email}`} className="underline">{o.email}</a><br />{o.phone}</p>
            <p className="mt-2 text-muted">{o.user ? "Registered customer" : "Guest checkout"}</p>
            <h2 className="mb-2 mt-4 font-medium">Ship to</h2>
            <p>{o.line1}{o.line2 && <>, {o.line2}</>}<br />Brgy. {o.barangay}, {o.city}<br />{o.province} {o.postalCode}<br />{o.region}</p>
            {o.notes && <><h2 className="mb-1 mt-4 font-medium">Customer notes</h2><p className="whitespace-pre-line">{o.notes}</p></>}
          </section>
          <section className="admin-card text-[13px]">
            <h2 className="mb-2 font-medium">Payment</h2>
            <p>{PAYMENT_METHODS[o.paymentMethod as PaymentMethod]} via {o.paymentProvider}</p>
            <ul className="mt-2 space-y-1 text-muted">
              {o.payments.map((p) => <li key={p.id}>{formatPHP(p.amount)} · {p.status.toLowerCase()}{p.fee ? ` · fee ${formatPHP(p.fee)}` : ""}{p.providerRef ? ` · ref ${p.providerRef}` : ""}</li>)}
              {o.refunds.map((r) => <li key={r.id}>Refund {formatPHP(r.amount)} · {r.reason} · {formatDate(r.createdAt)}</li>)}
            </ul>
          </section>
          <section className="admin-card">
            <h2 className="mb-2 text-[13px] font-medium">Shipping details</h2>
            <form action={saveOrderShipping} className="space-y-3">
              <input type="hidden" name="number" value={o.number} />
              <Field label="Courier" name="courier" defaultValue={o.courier} />
              <Field label="Tracking number" name="trackingNumber" defaultValue={o.trackingNumber} />
              <Field label="Actual shipping cost (₱)" name="shippingCost" defaultValue={centavosToPesosInput(o.shippingCost)} hint="Used for profit reports." inputMode="decimal" />
              <button className="admin-btn-ghost">Save</button>
            </form>
          </section>
          <section className="admin-card text-[12px]">
            <h2 className="mb-2 text-[13px] font-medium">History</h2>
            <ul className="space-y-2">
              {o.history.map((h) => (
                <li key={h.id}><span className="text-muted">{formatDate(h.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span> — {ORDER_STATUS_LABEL[h.toStatus as OrderStatus] ?? h.toStatus} <span className="text-muted">by {h.actor}</span>{h.note && <span className="block text-muted">{h.note}</span>}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
