import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCartSummary } from "@/lib/cart";
import { formatPHP } from "@/lib/money";
import { quoteShipping } from "@/lib/shipping";
import { removeCartItem, updateCartItem } from "@/app/actions/cart";
import { Media } from "@/components/Media";
import { DiscountForm } from "@/components/store/DiscountForm";

export const metadata: Metadata = { title: "Your Bag", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { cart, lines, subtotal, discount, hasProblems } = await getCartSummary();
  const ship = await quoteShipping(db, null, subtotal - discount.amount);

  if (!lines.length)
    return (
      <div className="container-luxe py-32 text-center">
        <h1 className="display text-5xl">Your bag is empty</h1>
        <p className="mt-4 text-muted">Discover something beautiful.</p>
        <Link href="/shop" className="btn-primary mt-10">Explore Collection</Link>
      </div>
    );

  return (
    <div className="container-luxe pt-14">
      <h1 className="display text-5xl lg:text-6xl">Your Bag</h1>
      <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((l) => (
            <li key={l.id} className="flex gap-5 py-6">
              <Link href={`/products/${l.productSlug}`} className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden bg-ivory sm:w-28">
                <Media src={l.image} alt={l.productName} sizes="112px" />
              </Link>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex justify-between gap-4">
                  <div>
                    <Link href={`/products/${l.productSlug}`} className="font-serif text-2xl">{l.productName}</Link>
                    <p className="text-[13px] text-muted">{l.variantName} · {formatPHP(l.unitPrice)}</p>
                  </div>
                  <p className="text-[15px]">{formatPHP(l.lineTotal)}</p>
                </div>
                {l.problem && <p className="text-[13px] text-red-700">{l.problem}</p>}
                <div className="mt-auto flex items-center gap-4">
                  <form action={updateCartItem} className="flex items-center gap-2">
                    <input type="hidden" name="itemId" value={l.id} />
                    <label htmlFor={`q-${l.id}`} className="sr-only">Quantity</label>
                    <select id={`q-${l.id}`} name="quantity" defaultValue={Math.min(l.quantity, Math.max(l.available, 1))} className="border border-line px-3 py-1.5 text-[13px]">
                      {Array.from({ length: Math.max(1, Math.min(l.available, 20)) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <button className="text-[12px] underline">Update</button>
                  </form>
                  <form action={removeCartItem}>
                    <input type="hidden" name="itemId" value={l.id} />
                    <button className="text-[12px] text-muted underline">Remove</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit space-y-6 bg-ivory p-8">
          <h2 className="eyebrow">Order Summary</h2>
          <DiscountForm applied={cart?.discountCode && discount.ok ? discount.code : null} />
          {cart?.discountCode && !discount.ok && <p className="text-[12px] text-red-700">{discount.message}</p>}
          <dl className="space-y-3 text-[14px]">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPHP(subtotal)}</dd></div>
            {discount.amount > 0 && <div className="flex justify-between text-sage"><dt>Discount</dt><dd>−{formatPHP(discount.amount)}</dd></div>}
            <div className="flex justify-between text-muted">
              <dt>Shipping (estimate)</dt>
              <dd>{ship.configured ? (ship.fee === 0 ? "Free" : formatPHP(ship.fee)) : "Calculated at checkout"}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-[16px]">
              <dt>Estimated total</dt>
              <dd>{formatPHP(subtotal - discount.amount + ship.fee)}</dd>
            </div>
          </dl>
          <p className="text-[12px] text-muted">Final shipping is calculated from your delivery region at checkout.</p>
          {hasProblems ? (
            <p className="text-[13px] text-red-700">Please update the items marked above to continue.</p>
          ) : (
            <Link href="/checkout" className="btn-primary w-full">Checkout</Link>
          )}
          <Link href="/shop" className="block text-center text-[12px] underline">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
