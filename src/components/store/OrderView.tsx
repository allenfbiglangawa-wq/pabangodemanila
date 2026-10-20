import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { formatPHP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABEL, PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from "@/lib/constants";

export type FullOrder = Prisma.OrderGetPayload<{ include: { items: true; history: true } }>;

const STEPS: OrderStatus[] = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];

export function OrderView({ order }: { order: FullOrder }) {
  const status = order.status as OrderStatus;
  const stepIndex = STEPS.indexOf(status === "COMPLETED" ? "DELIVERED" : status);
  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Order {order.number}</p>
          <h1 className="display mt-3 text-5xl">{ORDER_STATUS_LABEL[status]}</h1>
          <p className="mt-2 text-[13px] text-muted">Placed {formatDate(order.createdAt, { dateStyle: "long", timeStyle: "short" })}</p>
        </div>
        <p className="text-[13px] text-muted">Payment: {PAYMENT_METHODS[order.paymentMethod as PaymentMethod]}</p>
      </div>

      {stepIndex >= 0 && (
        <ol className="grid grid-cols-5 gap-2 text-center text-[11px] uppercase tracking-[0.14em]">
          {STEPS.map((s, i) => (
            <li key={s} className={i <= stepIndex ? "text-charcoal" : "text-muted/60"}>
              <span className={`mb-3 block h-px ${i <= stepIndex ? "bg-charcoal" : "bg-line"}`} />
              {ORDER_STATUS_LABEL[s]}
            </li>
          ))}
        </ol>
      )}
      {order.trackingNumber && (
        <p className="bg-ivory p-5 text-[14px]">Shipped via {order.courier ?? "courier"} · Tracking number <strong>{order.trackingNumber}</strong></p>
      )}

      <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
        <table className="w-full text-[14px]">
          <thead className="sr-only"><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
          <tbody className="divide-y divide-line border-y border-line">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="py-4"><span className="font-serif text-xl">{i.productName}</span><span className="block text-[12px] text-muted">{i.variantName} · {i.sku}</span></td>
                <td className="py-4 text-muted">× {i.quantity}</td>
                <td className="py-4 text-right">{formatPHP(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="h-fit space-y-2 bg-ivory p-6 text-[14px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPHP(order.subtotal)}</dd></div>
          {order.discountTotal > 0 && <div className="flex justify-between"><dt>Discount {order.discountCode && `(${order.discountCode})`}</dt><dd>−{formatPHP(order.discountTotal)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{formatPHP(order.shippingFee)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-[16px]"><dt>Total</dt><dd>{formatPHP(order.total)}</dd></div>
          {order.refundedTotal > 0 && <div className="flex justify-between text-muted"><dt>Refunded</dt><dd>{formatPHP(order.refundedTotal)}</dd></div>}
        </dl>
      </div>

      <div className="grid gap-10 sm:grid-cols-2">
        <div className="text-[14px] leading-relaxed">
          <p className="eyebrow mb-3">Delivering to</p>
          <p>{order.fullName}<br />{order.line1}{order.line2 && <>, {order.line2}</>}<br />Brgy. {order.barangay}, {order.city}<br />{order.province}, {order.postalCode}<br />{order.phone}</p>
        </div>
        <div className="text-[13px]">
          <p className="eyebrow mb-3">History</p>
          <ul className="space-y-2 text-muted">
            {order.history.map((h) => (
              <li key={h.id}>{formatDate(h.createdAt, { dateStyle: "medium", timeStyle: "short" })} — {ORDER_STATUS_LABEL[h.toStatus as OrderStatus] ?? h.toStatus}</li>
            ))}
          </ul>
        </div>
      </div>
      <Link href="/shop" className="btn-link">Continue shopping</Link>
    </div>
  );
}
