"use client";

import { useActionState } from "react";
import { applyDiscount, removeDiscount } from "@/app/actions/cart";

export function DiscountForm({ applied }: { applied: string | null }) {
  const [state, action, pending] = useActionState(applyDiscount, null);
  if (applied)
    return (
      <form action={removeDiscount} className="flex items-center justify-between text-[13px]">
        <span>Code <strong>{applied}</strong> applied</span>
        <button className="underline">Remove</button>
      </form>
    );
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <label htmlFor="discount" className="sr-only">Discount code</label>
        <input id="discount" name="code" placeholder="Discount code" className="field !py-2.5 uppercase" />
        <button className="btn-outline !px-5 !py-2.5" disabled={pending}>Apply</button>
      </div>
      {state && <p className={`text-[12px] ${state.ok ? "text-sage" : "text-red-700"}`}>{state.message}</p>}
    </form>
  );
}
