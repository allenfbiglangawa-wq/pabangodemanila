import Link from "next/link";
import { ORDER_STATUS_LABEL, EVENT_STATUS_LABEL, type OrderStatus, type EventStatus } from "@/lib/constants";

export function PageTitle({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <div className="admin-card h-full">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-80">{body}</Link> : body;
}

const ORDER_TONE: Partial<Record<OrderStatus, string>> = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-800",
  PAYMENT_UNDER_REVIEW: "bg-orange-50 text-orange-800",
  PAID: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-stone-100 text-stone-600",
  REFUNDED: "bg-rose-50 text-rose-800",
  COMPLETED: "bg-emerald-50 text-emerald-800",
};

export function OrderBadge({ status }: { status: string }) {
  return <span className={`badge ${ORDER_TONE[status as OrderStatus] ?? "bg-ivory text-charcoal"}`}>{ORDER_STATUS_LABEL[status as OrderStatus] ?? status}</span>;
}

export function EventBadge({ status }: { status: string }) {
  const tone = status === "CONFIRMED" || status === "EVENT_COMPLETED" ? "bg-emerald-50 text-emerald-800" : status === "DECLINED" ? "bg-stone-100 text-stone-600" : "bg-ivory";
  return <span className={`badge ${tone}`}>{EVENT_STATUS_LABEL[status as EventStatus] ?? status}</span>;
}

export function Flash({ sp }: { sp: { ok?: string; error?: string } }) {
  if (sp.error) return <p className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800" role="alert">{sp.error}</p>;
  if (sp.ok) return <p className="mb-6 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800" role="status">{sp.ok}</p>;
  return null;
}

export function Field({ label, name, defaultValue, type = "text", required, placeholder, hint, className, ...rest }: { label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; placeholder?: string; hint?: string; className?: string } & Record<string, unknown>) {
  return (
    <div className={className}>
      <label className="admin-label" htmlFor={`f-${name}`}>{label}</label>
      <input id={`f-${name}`} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} placeholder={placeholder} className="admin-input" {...rest} />
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, name, defaultValue, rows = 4, hint, className }: { label: string; name: string; defaultValue?: string | null; rows?: number; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="admin-label" htmlFor={`f-${name}`}>{label}</label>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={defaultValue ?? ""} className="admin-input" />
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="accent-charcoal" /> {label}
    </label>
  );
}
