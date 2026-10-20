import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCartSummary } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { PH_REGIONS } from "@/lib/constants";
import { formatPHP } from "@/lib/money";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { onlinePaymentsReady } from "@/lib/payments";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const { lines, subtotal, discount, hasProblems } = await getCartSummary();
  if (!lines.length || hasProblems) redirect("/cart");
  const [user, commerce] = await Promise.all([getCurrentUser(), getSetting("commerce")]);
  const address = user ? await db.address.findFirst({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }) : null;

  const methods = [
    ...(commerce.onlinePaymentsEnabled && onlinePaymentsReady()
      ? [
          { id: "GCASH", label: "GCash", note: "Pay securely through our payment partner." },
          { id: "MAYA", label: "Maya", note: "Pay securely through our payment partner." },
          { id: "CARD", label: "Debit / Credit Card", note: "Visa and Mastercard via our payment partner’s secure page." },
        ]
      : []),
    ...(commerce.bankTransferEnabled ? [{ id: "BANK_TRANSFER", label: "Bank Transfer", note: "Transfer manually; your order is confirmed after we verify the deposit." }] : []),
    ...(commerce.codEnabled ? [{ id: "COD", label: "Cash on Delivery", note: "Pay when your order arrives." }] : []),
  ];

  return (
    <div className="container-luxe pt-14">
      <h1 className="display text-5xl lg:text-6xl">Checkout</h1>
      {!user && (
        <p className="mt-4 text-[14px] text-muted">
          Checking out as a guest. <Link href="/account/login?next=/checkout" className="underline">Sign in</Link> for faster checkout and order history.
        </p>
      )}
      <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
        {lines.map((l) => (
          <li key={l.id}>{l.quantity} × {l.productName} ({l.variantName}) — {formatPHP(l.lineTotal)}</li>
        ))}
      </ul>
      <div className="mt-12">
        {methods.length === 0 ? (
          <p>Checkout is temporarily unavailable. Please contact us to order.</p>
        ) : (
          <CheckoutForm
            regions={PH_REGIONS}
            methods={methods}
            subtotal={subtotal}
            discount={discount.amount}
            signedIn={Boolean(user)}
            defaults={{
              fullName: address?.fullName ?? user?.name,
              email: user?.email,
              phone: address?.phone ?? user?.phone ?? undefined,
              line1: address?.line1,
              line2: address?.line2 ?? undefined,
              barangay: address?.barangay,
              city: address?.city,
              province: address?.province,
              region: address?.region,
              postalCode: address?.postalCode,
            }}
          />
        )}
      </div>
    </div>
  );
}
