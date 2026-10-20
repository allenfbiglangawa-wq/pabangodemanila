"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureCartId, readCartId } from "@/lib/cart";
import { available } from "@/lib/inventory";
import { evaluateDiscount } from "@/lib/discounts";
import { effectivePrice } from "@/lib/money";

export type ActionState = { ok: boolean; message: string } | null;

export async function addToCart(_prev: ActionState, form: FormData): Promise<ActionState> {
  const variantId = String(form.get("variantId") ?? "");
  const qty = Math.max(1, Math.min(20, parseInt(String(form.get("quantity") ?? "1"), 10) || 1));
  const buyNow = form.get("buyNow") === "1";
  const variant = await db.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") return { ok: false, message: "This item is unavailable." };

  const user = await getCurrentUser();
  const cartId = await ensureCartId(user?.id ?? null);
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const want = (existing?.quantity ?? 0) + qty;
  const avail = available(variant);
  if (avail <= 0) return { ok: false, message: "Sorry, this item is out of stock." };
  if (want > avail) return { ok: false, message: `Only ${avail} available.` };

  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    create: { cartId, variantId, quantity: qty },
    update: { quantity: want },
  });
  await db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  revalidatePath("/", "layout");
  if (buyNow) redirect("/checkout");
  return { ok: true, message: "Added to your bag." };
}

async function ownedItem(itemId: string) {
  const cartId = await readCartId();
  if (!cartId) return null;
  return db.cartItem.findFirst({ where: { id: itemId, cartId }, include: { variant: true } });
}

export async function updateCartItem(form: FormData) {
  const item = await ownedItem(String(form.get("itemId")));
  if (!item) return;
  const qty = parseInt(String(form.get("quantity")), 10);
  if (!Number.isFinite(qty) || qty <= 0) await db.cartItem.delete({ where: { id: item.id } });
  else await db.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(qty, Math.max(1, available(item.variant)), 20) } });
  revalidatePath("/", "layout");
}

export async function removeCartItem(form: FormData) {
  const item = await ownedItem(String(form.get("itemId")));
  if (item) await db.cartItem.delete({ where: { id: item.id } });
  revalidatePath("/", "layout");
}

export async function applyDiscount(_prev: ActionState, form: FormData): Promise<ActionState> {
  const cartId = await readCartId();
  if (!cartId) return { ok: false, message: "Your bag is empty." };
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const items = await db.cartItem.findMany({ where: { cartId }, include: { variant: true } });
  const subtotal = items.reduce((s, i) => s + effectivePrice(i.variant) * i.quantity, 0);
  const result = await evaluateDiscount(db, code, subtotal);
  if (!result.ok || !result.code) return { ok: false, message: result.message ?? "This code is not valid." };
  await db.cart.update({ where: { id: cartId }, data: { discountCode: result.code } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true, message: `Code ${result.code} applied.` };
}

export async function removeDiscount() {
  const cartId = await readCartId();
  if (cartId) await db.cart.update({ where: { id: cartId }, data: { discountCode: null } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
}
