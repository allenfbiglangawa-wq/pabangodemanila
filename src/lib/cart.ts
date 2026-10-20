import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { db, type Tx } from "./db";
import { randomToken } from "./crypto";
import { effectivePrice } from "./money";
import { available } from "./inventory";
import { evaluateDiscount } from "./discounts";

export const CART_COOKIE = "pdm_cart";

export async function readCartId(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

export async function ensureCartId(userId: string | null): Promise<string> {
  const existing = await readCartId();
  if (existing) {
    const c = await db.cart.findUnique({ where: { id: existing } });
    if (c) {
      if (userId && !c.userId) await db.cart.update({ where: { id: c.id }, data: { userId } });
      return c.id;
    }
  }
  const cart = await db.cart.create({ data: { id: randomToken(24), userId } });
  (await cookies()).set(CART_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return cart.id;
}

const cartInclude = {
  items: {
    include: {
      variant: {
        include: { product: { include: { images: { orderBy: { sortOrder: "asc" as const }, take: 1 } } } },
      },
    },
    orderBy: { id: "asc" as const },
  },
};

export async function loadCart(tx: Tx, cartId: string) {
  return tx.cart.findUnique({ where: { id: cartId }, include: cartInclude });
}

export type LoadedCart = NonNullable<Awaited<ReturnType<typeof loadCart>>>;

export interface CartLine {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  available: number;
  lineTotal: number;
  problem: string | null;
}

export async function priceCart(tx: Tx, cart: LoadedCart | null) {
  const lines: CartLine[] = (cart?.items ?? []).map((i) => {
    const v = i.variant;
    const avail = available(v);
    const unit = effectivePrice(v);
    let problem: string | null = null;
    if (!v.isActive || v.product.status !== "ACTIVE") problem = "No longer available";
    else if (avail === 0) problem = "Out of stock";
    else if (i.quantity > avail) problem = `Only ${avail} available`;
    return {
      id: i.id,
      variantId: v.id,
      productId: v.productId,
      productName: v.product.name,
      productSlug: v.product.slug,
      variantName: v.name,
      sku: v.sku,
      image: v.product.images[0]?.url ?? null,
      unitPrice: unit,
      compareAt: unit < v.price ? v.price : null,
      quantity: i.quantity,
      available: avail,
      lineTotal: unit * i.quantity,
      problem,
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const discount = await evaluateDiscount(tx, cart?.discountCode, subtotal);
  return {
    lines,
    subtotal,
    discount,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    hasProblems: lines.some((l) => l.problem),
  };
}

export const getCartSummary = cache(async () => {
  const id = await readCartId();
  const cart = id ? await loadCart(db, id) : null;
  return { cart, ...(await priceCart(db, cart)) };
});
