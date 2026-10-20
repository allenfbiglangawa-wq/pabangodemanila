import type { Tx } from "./db";

export interface DiscountResult {
  ok: boolean;
  amount: number;
  code: string | null;
  message?: string;
}

export async function evaluateDiscount(tx: Tx, rawCode: string | null | undefined, subtotal: number): Promise<DiscountResult> {
  if (!rawCode) return { ok: true, amount: 0, code: null };
  const code = rawCode.trim().toUpperCase();
  const d = await tx.discountCode.findUnique({ where: { code } });
  const now = new Date();
  if (!d || !d.isActive) return { ok: false, amount: 0, code: null, message: "This code is not valid." };
  if (d.startsAt && d.startsAt > now) return { ok: false, amount: 0, code: null, message: "This code is not active yet." };
  if (d.endsAt && d.endsAt < now) return { ok: false, amount: 0, code: null, message: "This code has expired." };
  if (d.usageLimit != null && d.usedCount >= d.usageLimit) return { ok: false, amount: 0, code: null, message: "This code has reached its usage limit." };
  if (subtotal < d.minSubtotal) return { ok: false, amount: 0, code: null, message: "Your bag does not meet the minimum for this code." };
  const amount = d.type === "PERCENT" ? Math.floor((subtotal * Math.min(d.value, 100)) / 100) : Math.min(d.value, subtotal);
  return { ok: true, amount, code: d.code };
}
