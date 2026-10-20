import "server-only";
import { db, type Tx } from "./db";
import { nextNumber } from "./counters";
import { loadCart, priceCart } from "./cart";
import { quoteShipping } from "./shipping";
import * as inventory from "./inventory";
import { randomToken } from "./crypto";
import { queueEmail } from "./email";
import { notifyAdmin } from "./notifications";
import { formatPHP } from "./money";
import { ORDER_STATUS_LABEL, ORDER_TRANSITIONS, PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from "./constants";
import { getSetting } from "./settings";
import { onlineProvider, onlinePaymentsReady } from "./payments";
import { siteUrl } from "./utils";

export class CheckoutError extends Error {}

export interface CheckoutInput {
  cartId: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string | null;
  barangay: string;
  city: string;
  province: string;
  region: string;
  postalCode: string;
  notes: string | null;
  paymentMethod: PaymentMethod;
}

const ONLINE_METHODS: PaymentMethod[] = ["GCASH", "MAYA", "CARD"];

async function addHistory(tx: Tx, orderId: string, from: string | null, to: string, actor: string, note?: string) {
  await tx.orderStatusHistory.create({ data: { orderId, fromStatus: from, toStatus: to, actor, note } });
}

/**
 * Creates the order, reserves stock and (for online methods) opens a hosted
 * checkout session. Returns where the customer should go next.
 */
export async function placeOrder(input: CheckoutInput): Promise<{ orderNumber: string; redirectUrl: string }> {
  const commerce = await getSetting("commerce");
  const online = ONLINE_METHODS.includes(input.paymentMethod);
  if (online && (!commerce.onlinePaymentsEnabled || !onlinePaymentsReady())) throw new CheckoutError("Online payment is not available right now.");
  if (input.paymentMethod === "BANK_TRANSFER" && !commerce.bankTransferEnabled) throw new CheckoutError("Bank transfer is not available.");
  if (input.paymentMethod === "COD" && !commerce.codEnabled) throw new CheckoutError("Cash on delivery is not available.");

  const provider = online ? onlineProvider() : null;
  const providerId = online ? provider!.id : input.paymentMethod === "COD" ? "cod" : "bank_transfer";

  const result = await db.$transaction(async (tx) => {
    const cart = await loadCart(tx, input.cartId);
    const priced = await priceCart(tx, cart);
    if (!cart || priced.lines.length === 0) throw new CheckoutError("Your bag is empty.");
    if (priced.hasProblems) throw new CheckoutError("Some items in your bag need attention before checkout.");
    if (cart.discountCode && !priced.discount.ok) throw new CheckoutError(priced.discount.message ?? "Discount code is no longer valid.");

    const discountTotal = priced.discount.amount;
    const ship = await quoteShipping(tx, input.region, priced.subtotal - discountTotal);
    const total = priced.subtotal - discountTotal + ship.fee;

    const number = await nextNumber(tx, "order", "PDM");
    const reservationExpiresAt =
      input.paymentMethod === "COD"
        ? null
        : new Date(
            Date.now() +
              (online ? commerce.reservationMinutesOnline * 60_000 : commerce.reservationHoursBankTransfer * 3_600_000),
          );

    const costs = new Map(cart.items.map((i) => [i.variantId, i.variant.cost]));
    const order = await tx.order.create({
      data: {
        number,
        userId: input.userId,
        email: input.email.toLowerCase(),
        phone: input.phone,
        fullName: input.fullName,
        line1: input.line1,
        line2: input.line2,
        barangay: input.barangay,
        city: input.city,
        province: input.province,
        region: input.region,
        postalCode: input.postalCode,
        notes: input.notes,
        status: "PENDING_PAYMENT",
        paymentMethod: input.paymentMethod,
        paymentProvider: providerId,
        subtotal: priced.subtotal,
        discountTotal,
        discountCode: priced.discount.code,
        shippingFee: ship.fee,
        total,
        reservationExpiresAt,
        items: {
          create: priced.lines.map((l) => ({
            variantId: l.variantId,
            productId: l.productId,
            productName: l.productName,
            variantName: l.variantName,
            sku: l.sku,
            unitPrice: l.unitPrice,
            unitCost: costs.get(l.variantId) ?? null,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
          })),
        },
      },
    });

    for (const l of priced.lines) {
      try {
        await inventory.reserve(tx, l.variantId, l.quantity, order.id);
      } catch (e) {
        if (e instanceof inventory.InsufficientStockError)
          throw new CheckoutError(`Sorry, ${l.productName} (${l.variantName}) just sold out or has fewer units left.`);
        throw e;
      }
    }

    if (priced.discount.code) {
      await tx.discountCode.update({ where: { code: priced.discount.code }, data: { usedCount: { increment: 1 } } });
    }

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        provider: providerId,
        method: input.paymentMethod,
        amount: total,
        idempotencyKey: randomToken(18),
      },
    });

    await addHistory(tx, order.id, null, "PENDING_PAYMENT", "customer", `Order placed (${PAYMENT_METHODS[input.paymentMethod]})`);
    await notifyAdmin(tx, "NEW_ORDER", `New order ${number} — ${formatPHP(total)}`, `/admin/orders/${number}`);
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { discountCode: null } });

    return { order, payment };
  });

  const { order, payment } = result;
  await queueEmail(
    order.email,
    `We received your order ${order.number}`,
    `Hi ${order.fullName},\n\nThank you for your order ${order.number} (${formatPHP(order.total)}).\n` +
      (online
        ? "We will confirm once your payment is verified."
        : order.paymentMethod === "BANK_TRANSFER"
          ? "Please complete your bank transfer using the details on your order page. Your order is confirmed once we verify the deposit."
          : "We will contact you to confirm your cash-on-delivery order.") +
      `\n\nView your order: ${siteUrl(`/order/${order.number}?email=${encodeURIComponent(order.email)}`)}\n`,
  );

  if (provider) {
    const session = await provider.createCheckout({
      orderId: order.id,
      orderNumber: order.number,
      paymentId: payment.id,
      idempotencyKey: payment.idempotencyKey,
      amount: order.total,
      method: order.paymentMethod as "GCASH" | "MAYA" | "CARD",
      customer: { name: order.fullName, email: order.email, phone: order.phone },
      successUrl: siteUrl(`/order/${order.number}?email=${encodeURIComponent(order.email)}`),
      cancelUrl: siteUrl(`/order/${order.number}?email=${encodeURIComponent(order.email)}`),
    });
    await db.payment.update({ where: { id: payment.id }, data: { providerRef: session.providerRef } });
    return { orderNumber: order.number, redirectUrl: session.redirectUrl };
  }
  return { orderNumber: order.number, redirectUrl: `/order/${order.number}?email=${encodeURIComponent(order.email)}` };
}

async function commitStock(tx: Tx, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.stockCommitted) return;
  for (const i of order.items) if (i.variantId) await inventory.commit(tx, i.variantId, i.quantity, order.id);
  await tx.order.update({ where: { id: orderId }, data: { stockCommitted: true, reservationExpiresAt: null } });
}

async function releaseStock(tx: Tx, orderId: string, reason: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.stockCommitted) return;
  for (const i of order.items) if (i.variantId) await inventory.release(tx, i.variantId, i.quantity, order.id, reason);
  await tx.order.update({ where: { id: orderId }, data: { reservationExpiresAt: null } });
}

async function sendStatusEmail(orderId: string, extra = "") {
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (!o) return;
  const label = ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status;
  await queueEmail(
    o.email,
    `Order ${o.number}: ${label}`,
    `Hi ${o.fullName},\n\nYour order ${o.number} is now: ${label}.${extra ? `\n${extra}` : ""}\n\n` +
      `View your order: ${siteUrl(`/order/${o.number}?email=${encodeURIComponent(o.email)}`)}\n`,
  );
}

/**
 * Reconciles a verified "payment succeeded" event. Idempotent: replays of the
 * same event or a second provider notification do nothing.
 */
export async function confirmPayment(idempotencyKey: string, opts: { providerRef?: string | null; amount?: number | null; fee?: number; actor: string }) {
  const outcome = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { idempotencyKey }, include: { order: true } });
    if (!payment) throw new Error("Unknown payment");
    if (payment.status === "SUCCEEDED") return { changed: false, orderId: payment.orderId };
    if (opts.amount != null && opts.amount !== payment.amount) {
      await notifyAdmin(tx, "PAYMENT_REVIEW", `Payment amount mismatch on ${payment.order.number}: expected ${formatPHP(payment.amount)}, got ${formatPHP(opts.amount)}`, `/admin/orders/${payment.order.number}`);
      await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAYMENT_UNDER_REVIEW" } });
      await addHistory(tx, payment.orderId, payment.order.status, "PAYMENT_UNDER_REVIEW", opts.actor, "Amount mismatch — needs review");
      return { changed: true, orderId: payment.orderId };
    }
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED", confirmedAt: new Date(), fee: opts.fee ?? 0, providerRef: opts.providerRef ?? payment.providerRef },
    });

    const order = payment.order;
    if (order.status === "CANCELLED") {
      // Paid after the reservation expired: try to take the stock again.
      try {
        for (const i of await tx.orderItem.findMany({ where: { orderId: order.id } }))
          if (i.variantId) await inventory.reserve(tx, i.variantId, i.quantity, order.id);
      } catch {
        await notifyAdmin(tx, "PAYMENT_REVIEW", `Late payment on cancelled order ${order.number} — stock no longer available. Refund or restock needed.`, `/admin/orders/${order.number}`);
        await tx.order.update({ where: { id: order.id }, data: { status: "PAYMENT_UNDER_REVIEW", paidAt: new Date() } });
        await addHistory(tx, order.id, "CANCELLED", "PAYMENT_UNDER_REVIEW", opts.actor, "Payment received after cancellation; stock unavailable");
        return { changed: true, orderId: order.id };
      }
    } else if (!["PENDING_PAYMENT", "PAYMENT_UNDER_REVIEW"].includes(order.status)) {
      return { changed: false, orderId: order.id };
    }

    await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date() } });
    await addHistory(tx, order.id, order.status, "PAID", opts.actor, "Payment verified");
    await commitStock(tx, order.id);
    return { changed: true, orderId: order.id };
  });
  if (outcome.changed) await sendStatusEmail(outcome.orderId, "Thank you — your payment has been verified.");
  return outcome;
}

export async function failPayment(idempotencyKey: string) {
  await db.payment.updateMany({ where: { idempotencyKey, status: "PENDING" }, data: { status: "FAILED" } });
}

/** Customer submits their bank transfer reference. */
export async function submitBankReference(orderNumber: string, email: string, reference: string) {
  await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { number: orderNumber } });
    if (!o || o.email !== email.toLowerCase() || o.paymentMethod !== "BANK_TRANSFER") throw new Error("Order not found");
    if (o.status !== "PENDING_PAYMENT") return;
    // Keep the stock on hold while the owner reviews.
    await tx.order.update({ where: { id: o.id }, data: { bankTransferRef: reference, status: "PAYMENT_UNDER_REVIEW", reservationExpiresAt: null } });
    await addHistory(tx, o.id, o.status, "PAYMENT_UNDER_REVIEW", "customer", `Bank reference submitted: ${reference}`);
    await notifyAdmin(tx, "PAYMENT_REVIEW", `Bank transfer to verify for ${o.number}`, `/admin/orders/${o.number}`);
  });
}

/** Admin status change with inventory side effects. */
export async function transitionOrder(orderId: string, to: OrderStatus, actor: string, note?: string, extra?: { trackingNumber?: string; courier?: string }) {
  await db.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true } });
    const from = o.status as OrderStatus;
    if (!ORDER_TRANSITIONS[from].includes(to)) throw new Error(`Cannot move from ${ORDER_STATUS_LABEL[from]} to ${ORDER_STATUS_LABEL[to]}`);
    if (to === "REFUNDED") throw new Error("Use the refund form to refund an order.");

    // Online orders can only become PAID through a verified webhook; owners verify bank transfers.
    if (to === "PAID") {
      if (o.paymentMethod !== "BANK_TRANSFER") throw new Error("Online payments are confirmed automatically by the payment provider.");
      const p = o.payments.find((x) => x.status === "PENDING");
      if (p) await tx.payment.update({ where: { id: p.id }, data: { status: "SUCCEEDED", confirmedAt: new Date(), providerRef: o.bankTransferRef } });
      await tx.order.update({ where: { id: o.id }, data: { paidAt: new Date() } });
    }
    if (to === "PROCESSING" && from === "PENDING_PAYMENT" && o.paymentMethod !== "COD")
      throw new Error("Only cash-on-delivery orders can be processed before payment.");

    if (to === "CANCELLED") {
      if (o.stockCommitted) {
        const items = await tx.orderItem.findMany({ where: { orderId: o.id } });
        for (const i of items) if (i.variantId) await inventory.returnToStock(tx, i.variantId, i.quantity, o.id, null, "Order cancelled");
      } else {
        await releaseStock(tx, o.id, "Order cancelled");
      }
      await tx.payment.updateMany({ where: { orderId: o.id, status: "PENDING" }, data: { status: "CANCELLED" } });
    } else if (["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"].includes(to)) {
      await commitStock(tx, o.id);
    }

    if (to === "DELIVERED" && o.paymentMethod === "COD") {
      await tx.payment.updateMany({ where: { orderId: o.id, status: "PENDING" }, data: { status: "SUCCEEDED", confirmedAt: new Date() } });
      await tx.order.update({ where: { id: o.id }, data: { paidAt: new Date() } });
    }

    await tx.order.update({
      where: { id: o.id },
      data: { status: to, trackingNumber: extra?.trackingNumber || o.trackingNumber, courier: extra?.courier || o.courier },
    });
    await addHistory(tx, o.id, from, to, actor, note);
  });
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const extraText = to === "SHIPPED" && o.trackingNumber ? `Courier: ${o.courier ?? ""} · Tracking number: ${o.trackingNumber}` : "";
  if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(to)) await sendStatusEmail(orderId, extraText);
}

export interface RefundInput {
  orderId: string;
  amount: number;
  reason: string;
  restock: { orderItemId: string; quantity: number }[];
  actor: { id: string; email: string };
}

export async function refundOrder(input: RefundInput) {
  await db.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({ where: { id: input.orderId }, include: { items: true } });
    if (!["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"].includes(o.status))
      throw new Error("Only paid orders can be refunded.");
    const remaining = o.total - o.refundedTotal;
    if (input.amount <= 0 || input.amount > remaining) throw new Error(`Refund must be between ₱0.01 and ${formatPHP(remaining)}.`);

    for (const r of input.restock) {
      if (r.quantity <= 0) continue;
      const item = o.items.find((i) => i.id === r.orderItemId);
      if (!item) throw new Error("Unknown order item");
      if (r.quantity > item.quantity - item.refundedQuantity) throw new Error(`Cannot return more ${item.productName} than was ordered.`);
      await tx.orderItem.update({ where: { id: item.id }, data: { refundedQuantity: { increment: r.quantity } } });
      if (item.variantId && o.stockCommitted)
        await inventory.returnToStock(tx, item.variantId, r.quantity, o.id, input.actor.id, `Return: ${input.reason}`);
    }

    const refundedTotal = o.refundedTotal + input.amount;
    await tx.refund.create({
      data: { orderId: o.id, amount: input.amount, reason: input.reason, restocked: input.restock.some((r) => r.quantity > 0), adminId: input.actor.id },
    });
    const full = refundedTotal >= o.total;
    await tx.order.update({ where: { id: o.id }, data: { refundedTotal, status: full ? "REFUNDED" : o.status } });
    await addHistory(tx, o.id, o.status, full ? "REFUNDED" : o.status, input.actor.email, `${full ? "Full" : "Partial"} refund ${formatPHP(input.amount)}: ${input.reason}`);
    if (full) await tx.payment.updateMany({ where: { orderId: o.id, status: "SUCCEEDED" }, data: { status: "REFUNDED" } });
  });
  const o = await db.order.findUniqueOrThrow({ where: { id: input.orderId } });
  await queueEmail(o.email, `Refund for order ${o.number}`, `Hi ${o.fullName},\n\nA refund of ${formatPHP(input.amount)} has been issued for order ${o.number}.\n`);
}

/** Cancels unpaid orders whose stock hold has expired. Safe to run repeatedly. */
export async function expireReservations(now = new Date()): Promise<number> {
  const expired = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", stockCommitted: false, reservationExpiresAt: { lt: now } },
    select: { id: true },
  });
  for (const { id } of expired) {
    await db.$transaction(async (tx) => {
      const o = await tx.order.findUniqueOrThrow({ where: { id } });
      if (o.status !== "PENDING_PAYMENT" || !o.reservationExpiresAt || o.reservationExpiresAt >= now) return;
      await releaseStock(tx, id, "Reservation expired (unpaid)");
      await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
      await tx.payment.updateMany({ where: { orderId: id, status: "PENDING" }, data: { status: "CANCELLED" } });
      await addHistory(tx, id, "PENDING_PAYMENT", "CANCELLED", "system", "Payment not received before the reservation expired");
    });
  }
  return expired.length;
}
