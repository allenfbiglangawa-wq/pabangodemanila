"use client";

import { useActionState } from "react";
import { bankReferenceAction } from "@/app/actions/checkout";

export function BankReferenceForm({ number, email }: { number: string; email: string }) {
  const [state, action, pending] = useActionState(bankReferenceAction, null);
  if (state?.ok) return <p className="text-[14px]">{state.message}</p>;
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row">
      <input type="hidden" name="number" value={number} />
      <input type="hidden" name="email" value={email} />
      <label htmlFor="bank-ref" className="sr-only">Transfer reference number</label>
      <input id="bank-ref" name="reference" required placeholder="Transfer reference number" className="field flex-1" />
      <button className="btn-primary" disabled={pending}>Submit reference</button>
      {state && !state.ok && <p className="text-[13px] text-red-700">{state.message}</p>}
    </form>
  );
}
