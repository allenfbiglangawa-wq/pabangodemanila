import { notFound } from "next/navigation";
import { hmac, safeEqual } from "@/lib/crypto";
import { formatPHP } from "@/lib/money";
import { siteUrl } from "@/lib/utils";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * DEVELOPMENT ONLY. Stands in for a provider-hosted checkout page. Choosing
 * an outcome sends a signed webhook to our own endpoint, exactly as a real
 * provider would, so the full verify → reconcile path is exercised.
 */
async function simulate(form: FormData) {
  "use server";
  if (process.env.NODE_ENV === "production") throw new Error("Not available");
  const key = String(form.get("key"));
  const amount = Number(form.get("amount"));
  const outcome = String(form.get("outcome"));
  const payment = await db.payment.findUnique({ where: { idempotencyKey: key }, include: { order: true } });
  if (!payment) throw new Error("Unknown payment");
  const body = JSON.stringify({ id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`, type: outcome === "succeed" ? "payment.succeeded" : "payment.failed", key, amount });
  await fetch(siteUrl("/api/webhooks/payments/stub"), { method: "POST", body, headers: { "content-type": "application/json", "x-stub-signature": hmac(body) } });
  const { redirect } = await import("next/navigation");
  redirect(`/order/${payment.order.number}?email=${encodeURIComponent(payment.order.email)}`);
}

export default async function Simulator({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  if (!sp.sig || !safeEqual(sp.sig, hmac(`${sp.key}:${sp.amount}`))) notFound();
  return (
    <div className="container-luxe max-w-lg py-20 text-center">
      <p className="eyebrow">Development payment simulator</p>
      <h1 className="display mt-4 text-5xl">{formatPHP(Number(sp.amount))}</h1>
      <p className="mt-3 text-muted">Order {sp.order} · {sp.method}</p>
      <p className="mt-6 bg-ivory p-4 text-[13px]">This page replaces the payment provider’s hosted checkout until PayMongo, Xendit or another provider is connected. No money moves.</p>
      <form action={simulate} className="mt-10 flex justify-center gap-4">
        <input type="hidden" name="key" value={sp.key} />
        <input type="hidden" name="amount" value={sp.amount} />
        <button name="outcome" value="succeed" className="btn-primary">Simulate success</button>
        <button name="outcome" value="fail" className="btn-outline">Simulate failure</button>
      </form>
    </div>
  );
}
