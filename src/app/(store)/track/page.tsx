import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const metadata: Metadata = { title: "Track an Order" };

async function track(form: FormData) {
  "use server";
  const number = String(form.get("number") ?? "").trim().toUpperCase();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!(await rateLimit("track", 10, 60_000))) redirect("/track?error=wait");
  const order = await db.order.findUnique({ where: { number } });
  if (!order || order.email !== email) redirect("/track?error=notfound");
  redirect(`/order/${order.number}?email=${encodeURIComponent(email)}`);
}

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="container-luxe max-w-lg py-20">
      <h1 className="display text-5xl">Track an Order</h1>
      <p className="mt-4 text-muted">Enter your order number and the email you used at checkout.</p>
      <form action={track} className="mt-10 space-y-5">
        <div><label className="label" htmlFor="t-num">Order number</label><input id="t-num" name="number" required placeholder="PDM-100001" className="field" /></div>
        <div><label className="label" htmlFor="t-email">Email</label><input id="t-email" name="email" type="email" required className="field" /></div>
        {error && <p className="text-[13px] text-red-700">{error === "wait" ? "Too many attempts. Please wait a minute." : "We couldn’t find an order with those details."}</p>}
        <button className="btn-primary w-full">Track</button>
      </form>
    </div>
  );
}
