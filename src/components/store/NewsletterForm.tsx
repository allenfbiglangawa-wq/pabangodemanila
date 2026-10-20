"use client";

import { useActionState } from "react";
import { subscribe } from "@/app/actions/newsletter";

export function NewsletterForm({ consentText, source, dark = false }: { consentText: string; source: string; dark?: boolean }) {
  const [state, action, pending] = useActionState(subscribe, null);
  if (state?.ok) return <p className="font-serif text-2xl italic">{state.message}</p>;
  return (
    <form action={action} className="w-full space-y-4">
      <input type="hidden" name="source" value={source} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className={`flex border-b ${dark ? "border-pearl/40" : "border-charcoal/30"}`}>
        <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
        <input
          id={`nl-${source}`}
          type="email"
          name="email"
          required
          placeholder="Your email address"
          className={`min-w-0 flex-1 bg-transparent py-3 text-[15px] focus:outline-none ${dark ? "placeholder:text-pearl/50" : "placeholder:text-muted"}`}
        />
        <button className="shrink-0 pl-3 text-[12px] font-medium uppercase tracking-[0.2em]" disabled={pending}>
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      <label className={`flex items-start gap-3 text-left text-[12px] leading-relaxed ${dark ? "text-pearl/70" : "text-muted"}`}>
        <input type="checkbox" name="consent" required className="mt-0.5 accent-champagne" />
        <span>
          {consentText} See our <a href="/policies/privacy" className="underline">Privacy Policy</a>.
        </span>
      </label>
      {state && !state.ok && <p className="text-[13px] text-red-700">{state.message}</p>}
    </form>
  );
}
