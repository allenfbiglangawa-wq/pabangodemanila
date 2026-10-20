"use client";

import { useActionState, useState } from "react";
import { addToCart } from "@/app/actions/cart";
import { formatPHP } from "@/lib/money";

export interface VariantOption {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  available: number;
}

export function AddToCartForm({ variants, compact = false, showBuyNow = false }: { variants: VariantOption[]; compact?: boolean; showBuyNow?: boolean }) {
  const [state, action, pending] = useActionState(addToCart, null);
  const firstAvailable = variants.find((v) => v.available > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id ?? "");
  const [qty, setQty] = useState(1);
  const selected = variants.find((v) => v.id === variantId);
  const soldOut = !selected || selected.available <= 0;

  if (!variants.length) return null;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="variantId" value={variantId} />
      {variants.length > 1 && (
        <fieldset>
          <legend className="label">{variants.some((v) => v.name.includes("·")) ? "Scent" : "Size"}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                type="button"
                key={v.id}
                onClick={() => setVariantId(v.id)}
                aria-pressed={v.id === variantId}
                className={`min-w-[84px] border px-4 py-2.5 text-[13px] transition-colors ${
                  v.id === variantId ? "border-charcoal bg-charcoal text-pearl" : "border-line hover:border-charcoal"
                } ${v.available <= 0 ? "line-through opacity-50" : ""}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {!compact && selected && (
        <p className="text-[13px] text-muted" aria-live="polite">
          {selected.available <= 0
            ? "Out of stock"
            : selected.available <= 5
              ? `Only ${selected.available} left`
              : "In stock"}
        </p>
      )}

      <div className="flex items-stretch gap-3">
        {!compact && (
          <div className="flex items-center border border-line">
            <button type="button" className="px-4 py-3 text-lg" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <input
              name="quantity"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(selected?.available || 1, parseInt(e.target.value, 10) || 1)))}
              className="w-10 text-center text-[15px] focus:outline-none"
              inputMode="numeric"
              aria-label="Quantity"
            />
            <button
              type="button"
              className="px-4 py-3 text-lg"
              aria-label="Increase quantity"
              onClick={() => setQty((q) => Math.min(selected?.available || 1, q + 1))}
            >
              +
            </button>
          </div>
        )}
        {compact && <input type="hidden" name="quantity" value="1" />}
        <button className="btn-primary flex-1" disabled={pending || soldOut}>
          {soldOut ? "Sold Out" : pending ? "Adding…" : compact ? "Add to Bag" : `Add to Bag · ${selected ? formatPHP(selected.salePrice ?? selected.price) : ""}`}
        </button>
      </div>
      {showBuyNow && !soldOut && (
        <button name="buyNow" value="1" className="btn-outline w-full" disabled={pending}>
          Buy Now
        </button>
      )}
      {state && (
        <p className={`text-[13px] ${state.ok ? "text-sage" : "text-red-700"}`} role="status">
          {state.message} {state.ok && <a href="/cart" className="underline">View bag</a>}
        </p>
      )}
    </form>
  );
}
