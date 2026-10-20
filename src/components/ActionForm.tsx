"use client";

import { useActionState } from "react";

type State = { ok: boolean; message: string } | null;

/** Generic form wrapper for server actions that return { ok, message }. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className = "space-y-5",
  buttonClassName = "btn-primary w-full",
  hideOnSuccess = false,
}: {
  action: (prev: State, form: FormData) => Promise<State>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  buttonClassName?: string;
  hideOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  if (hideOnSuccess && state?.ok) return <p className="text-[14px]" role="status">{state.message}</p>;
  return (
    <form action={formAction} className={className}>
      {children}
      {state && (
        <p className={`text-[13px] ${state.ok ? "text-sage" : "text-red-700"}`} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}
      <button className={buttonClassName} disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
