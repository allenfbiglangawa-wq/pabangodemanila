"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { checkoutAction, quoteAction } from "@/app/actions/checkout";
import { formatPHP } from "@/lib/money";

interface Props {
  regions: string[];
  methods: { id: string; label: string; note: string }[];
  subtotal: number;
  discount: number;
  defaults: Partial<Record<string, string>>;
  signedIn: boolean;
}

export function CheckoutForm({ regions, methods, subtotal, discount, defaults, signedIn }: Props) {
  const [state, action, pending] = useActionState(checkoutAction, null);
  const [ship, setShip] = useState<{ fee: number; configured: boolean } | null>(null);
  const [quoting, startQuote] = useTransition();
  const f = state?.fields ?? {};
  useEffect(() => {
    if (defaults.region) startQuote(async () => setShip(await quoteAction(defaults.region!)));
  }, [defaults.region]);

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={props.className}>
      <label className="label" htmlFor={`co-${name}`}>{label}</label>
      <input id={`co-${name}`} name={name} defaultValue={defaults[name]} className="field" aria-invalid={Boolean(f[name])} aria-describedby={f[name] ? `err-${name}` : undefined} {...props} />
      {f[name] && <p id={`err-${name}`} className="mt-1 text-[12px] text-red-700">{f[name]}</p>}
    </div>
  );

  return (
    <form action={action} className="grid gap-14 lg:grid-cols-[1fr_380px]">
      <div className="space-y-12">
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="eyebrow mb-6">Contact</legend>
          {field("fullName", "Full name", { required: true, autoComplete: "name", className: "sm:col-span-2" })}
          {field("email", "Email", { type: "email", required: true, autoComplete: "email" })}
          {field("phone", "Mobile number", { type: "tel", required: true, autoComplete: "tel", placeholder: "0917 123 4567" })}
        </fieldset>

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="eyebrow mb-6">Shipping address</legend>
          {field("line1", "House no., street, building", { required: true, autoComplete: "address-line1", className: "sm:col-span-2" })}
          {field("line2", "Unit, floor, landmark (optional)", { autoComplete: "address-line2", className: "sm:col-span-2" })}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="co-region">Region</label>
            <select
              id="co-region"
              name="region"
              required
              defaultValue={defaults.region ?? ""}
              className="field"
              onChange={(e) => {
                const region = e.target.value;
                startQuote(async () => setShip(await quoteAction(region)));
              }}
            >
              <option value="" disabled>Select region</option>
              {regions.map((r) => <option key={r}>{r}</option>)}
            </select>
            {f.region && <p className="mt-1 text-[12px] text-red-700">{f.region}</p>}
          </div>
          {field("province", "Province", { required: true, autoComplete: "address-level1" })}
          {field("city", "City / Municipality", { required: true, autoComplete: "address-level2" })}
          {field("barangay", "Barangay", { required: true, autoComplete: "address-level3" })}
          {field("postalCode", "Postal code", { required: true, inputMode: "numeric", maxLength: 4, autoComplete: "postal-code" })}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="co-notes">Order notes (optional)</label>
            <textarea id="co-notes" name="notes" rows={3} maxLength={500} className="field" placeholder="Delivery instructions, gift message…" />
          </div>
          {signedIn && (
            <label className="flex items-center gap-3 text-[14px] sm:col-span-2">
              <input type="checkbox" name="saveAddress" className="accent-champagne" /> Save this address to my account
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend className="eyebrow mb-6">Payment</legend>
          <div className="divide-y divide-line border border-line">
            {methods.map((m, i) => (
              <label key={m.id} className="flex cursor-pointer items-start gap-4 p-5 has-[:checked]:bg-ivory">
                <input type="radio" name="paymentMethod" value={m.id} defaultChecked={i === 0} className="mt-1 accent-charcoal" />
                <span>
                  <span className="block text-[15px]">{m.label}</span>
                  <span className="block text-[13px] text-muted">{m.note}</span>
                </span>
              </label>
            ))}
          </div>
          {f.paymentMethod && <p className="mt-1 text-[12px] text-red-700">{f.paymentMethod}</p>}
          <p className="mt-4 text-[12px] text-muted">Card details are entered only on our payment provider’s secure page and are never stored by Pabango de Manila.</p>
        </fieldset>
      </div>

      <aside className="h-fit space-y-6 bg-ivory p-8 lg:sticky lg:top-28">
        <h2 className="eyebrow">Summary</h2>
        <dl className="space-y-3 text-[14px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPHP(subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-sage"><dt>Discount</dt><dd>−{formatPHP(discount)}</dd></div>}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{quoting ? "…" : ship ? (ship.fee === 0 ? (ship.configured ? "Free" : "To be confirmed") : formatPHP(ship.fee)) : "Select region"}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-[17px]">
            <dt>Total</dt>
            <dd>{formatPHP(subtotal - discount + (ship?.fee ?? 0))}</dd>
          </div>
        </dl>
        {state && !state.ok && <p className="text-[13px] text-red-700" role="alert">{state.message}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Placing order…" : "Place Order"}</button>
        <p className="text-[12px] leading-relaxed text-muted">
          By placing your order you agree to our <a href="/policies/terms" className="underline">Terms</a> and <a href="/policies/privacy" className="underline">Privacy Policy</a>. Items are held for you while payment is completed.
        </p>
      </aside>
    </form>
  );
}
