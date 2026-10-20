import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { formatPHP } from "@/lib/money";
import { OrderView } from "@/components/store/OrderView";
import { BankReferenceForm } from "@/components/store/BankReferenceForm";

export const metadata: Metadata = { title: "Your Order", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Order status page. Guests need the order email in the URL; signed-in owners don't. */
export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ email?: string }> }) {
  const { number } = await params;
  const { email } = await searchParams;
  const order = await db.order.findUnique({ where: { number }, include: { items: true, history: { orderBy: { createdAt: "asc" } } } });
  const user = await getCurrentUser();
  if (!order || !((email && email.toLowerCase() === order.email) || (user && user.id === order.userId))) notFound();
  const commerce = await getSetting("commerce");

  return (
    <div className="container-luxe max-w-5xl pt-14">
      {order.status === "PENDING_PAYMENT" && order.paymentMethod === "BANK_TRANSFER" && (
        <section className="mb-14 space-y-4 border border-sand bg-ivory p-8">
          <p className="eyebrow">Complete your bank transfer</p>
          <p className="font-serif text-3xl">Please transfer {formatPHP(order.total)}</p>
          <p className="whitespace-pre-line text-[14px] leading-relaxed">{commerce.bankDetails || "Bank details will be sent to you by email."}</p>
          <p className="text-[13px] text-muted">
            Use <strong>{order.number}</strong> as the reference. Your items are held until {formatDate(order.reservationExpiresAt, { dateStyle: "medium", timeStyle: "short" })}.
            Once transferred, enter your reference number below so we can verify it.
          </p>
          <BankReferenceForm number={order.number} email={order.email} />
        </section>
      )}
      {order.status === "PENDING_PAYMENT" && ["GCASH", "MAYA", "CARD"].includes(order.paymentMethod) && (
        <p className="mb-10 bg-ivory p-5 text-[14px]">
          We have not received confirmation of your payment yet. If you have just paid, this page will update once our payment partner confirms it.
          Your items are held until {formatDate(order.reservationExpiresAt, { dateStyle: "medium", timeStyle: "short" })}.
        </p>
      )}
      {order.status === "PAYMENT_UNDER_REVIEW" && <p className="mb-10 bg-ivory p-5 text-[14px]">We are verifying your payment. You will receive an email once it is confirmed.</p>}
      <OrderView order={order} />
    </div>
  );
}
