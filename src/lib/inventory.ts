import type { Tx } from "./db";
import { notifyAdmin } from "./notifications";

export class InsufficientStockError extends Error {
  constructor(public sku: string, public available: number) {
    super(`Only ${available} left for ${sku}`);
  }
}

type MovementType = "ADJUSTMENT" | "RESTOCK" | "RESERVE" | "RELEASE" | "SALE" | "RETURN" | "IMPORT";

interface MoveInput {
  variantId: string;
  type: MovementType;
  onHandDelta: number;
  reservedDelta: number;
  reason: string;
  adminId?: string | null;
  orderId?: string | null;
}

/**
 * Applies a stock change with a single conditional UPDATE so concurrent
 * checkouts can never push available stock (on hand − reserved) below zero,
 * then writes the movement log and raises low-stock alerts.
 * Must run inside a transaction.
 */
async function move(tx: Tx, m: MoveInput): Promise<void> {
  // Reservations must leave available ≥ 0; other moves only require on-hand ≥ 0.
  const guardAvailable = m.reservedDelta > 0 || m.onHandDelta < 0;
  const affected = guardAvailable
    ? await tx.$executeRaw`
        UPDATE "ProductVariant"
        SET "stockOnHand" = "stockOnHand" + ${m.onHandDelta},
            "stockReserved" = "stockReserved" + ${m.reservedDelta}
        WHERE "id" = ${m.variantId}
          AND ("stockOnHand" + ${m.onHandDelta}) - ("stockReserved" + ${m.reservedDelta}) >= 0
          AND "stockOnHand" + ${m.onHandDelta} >= 0
          AND "stockReserved" + ${m.reservedDelta} >= 0`
    : await tx.$executeRaw`
        UPDATE "ProductVariant"
        SET "stockOnHand" = "stockOnHand" + ${m.onHandDelta},
            "stockReserved" = "stockReserved" + ${m.reservedDelta}
        WHERE "id" = ${m.variantId}
          AND "stockOnHand" + ${m.onHandDelta} >= 0
          AND "stockReserved" + ${m.reservedDelta} >= 0`;

  const v = await tx.productVariant.findUniqueOrThrow({
    where: { id: m.variantId },
    include: { product: { select: { name: true } } },
  });
  if (affected === 0) throw new InsufficientStockError(v.sku, Math.max(0, v.stockOnHand - v.stockReserved));

  const prevOnHand = v.stockOnHand - m.onHandDelta;
  const prevReserved = v.stockReserved - m.reservedDelta;
  await tx.inventoryMovement.create({
    data: {
      variantId: m.variantId,
      type: m.type,
      quantityChange: m.onHandDelta !== 0 ? m.onHandDelta : -m.reservedDelta,
      previousOnHand: prevOnHand,
      newOnHand: v.stockOnHand,
      previousReserved: prevReserved,
      newReserved: v.stockReserved,
      reason: m.reason,
      adminId: m.adminId ?? null,
      orderId: m.orderId ?? null,
    },
  });

  const before = prevOnHand - prevReserved;
  const after = v.stockOnHand - v.stockReserved;
  if (after <= v.lowStockThreshold && before > v.lowStockThreshold) {
    const label = `${v.product.name} (${v.name})`;
    await notifyAdmin(
      tx,
      "LOW_STOCK",
      after <= 0 ? `Out of Stock: ${label}` : `Low Stock: ${label} — ${after} units remaining.`,
      `/admin/inventory?q=${encodeURIComponent(v.sku)}`,
    );
  }
}

export function available(v: { stockOnHand: number; stockReserved: number }): number {
  return Math.max(0, v.stockOnHand - v.stockReserved);
}

export async function reserve(tx: Tx, variantId: string, qty: number, orderId: string) {
  await move(tx, { variantId, type: "RESERVE", onHandDelta: 0, reservedDelta: qty, reason: "Reserved for order", orderId });
}

export async function release(tx: Tx, variantId: string, qty: number, orderId: string, reason: string) {
  await move(tx, { variantId, type: "RELEASE", onHandDelta: 0, reservedDelta: -qty, reason, orderId });
}

/** Converts a reservation into a sale: stock leaves on-hand and the hold is cleared. */
export async function commit(tx: Tx, variantId: string, qty: number, orderId: string) {
  await move(tx, { variantId, type: "SALE", onHandDelta: -qty, reservedDelta: -qty, reason: "Order paid / fulfilled", orderId });
}

export async function returnToStock(tx: Tx, variantId: string, qty: number, orderId: string, adminId: string | null, reason: string) {
  await move(tx, { variantId, type: "RETURN", onHandDelta: qty, reservedDelta: 0, reason, orderId, adminId });
}

export async function adjust(
  tx: Tx,
  variantId: string,
  delta: number,
  type: "ADJUSTMENT" | "RESTOCK" | "IMPORT",
  reason: string,
  adminId: string | null,
) {
  if (delta === 0) return;
  await move(tx, { variantId, type, onHandDelta: delta, reservedDelta: 0, reason, adminId });
}
