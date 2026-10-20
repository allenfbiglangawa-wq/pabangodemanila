"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readCartId, getCartSummary } from "@/lib/cart";
import { placeOrder, CheckoutError, submitBankReference } from "@/lib/orders";
import { quoteShipping } from "@/lib/shipping";
import { PAYMENT_METHODS, PH_REGIONS, type PaymentMethod } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

export type CheckoutState = { ok: boolean; message: string; fields?: Record<string, string> } | null;

const phone = z
  .string()
  .transform((s) => s.replace(/[\s-()]/g, ""))
  .refine((s) => /^(\+639|09)\d{9}$/.test(s), "Enter a Philippine mobile number, e.g. 0917 123 4567");

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone,
  line1: z.string().trim().min(3, "Enter your street address").max(200),
  line2: z.string().trim().max(200).optional().transform((s) => s || null),
  barangay: z.string().trim().min(2, "Enter your barangay").max(120),
  city: z.string().trim().min(2, "Enter your city or municipality").max(120),
  province: z.string().trim().min(2, "Enter your province").max(120),
  region: z.enum(PH_REGIONS as [string, ...string[]], { message: "Choose your region" }),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Postal codes have 4 digits"),
  notes: z.string().trim().max(500).optional().transform((s) => s || null),
  paymentMethod: z.enum(Object.keys(PAYMENT_METHODS) as [PaymentMethod, ...PaymentMethod[]], { message: "Choose a payment method" }),
  saveAddress: z.string().optional(),
});

export async function checkoutAction(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  if (!(await rateLimit("checkout", 10, 60_000))) return { ok: false, message: "Too many attempts. Please wait a minute." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: "Please check the highlighted fields.", fields };
  }
  const cartId = await readCartId();
  if (!cartId) return { ok: false, message: "Your bag is empty." };
  const user = await getCurrentUser();
  const d = parsed.data;

  let redirectUrl: string;
  try {
    const result = await placeOrder({ ...d, cartId, userId: user?.id ?? null });
    redirectUrl = result.redirectUrl;
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "We could not place your order. Please try again." };
  }

  if (user && d.saveAddress === "on") {
    const count = await db.address.count({ where: { userId: user.id } });
    await db.address.create({
      data: { userId: user.id, fullName: d.fullName, phone: d.phone, line1: d.line1, line2: d.line2, barangay: d.barangay, city: d.city, province: d.province, region: d.region, postalCode: d.postalCode, isDefault: count === 0 },
    });
  }
  revalidatePath("/", "layout");
  redirect(redirectUrl);
}

export async function quoteAction(region: string) {
  const { subtotal, discount } = await getCartSummary();
  const q = await quoteShipping(db, PH_REGIONS.includes(region) ? region : null, subtotal - discount.amount);
  return { fee: q.fee, configured: q.configured };
}

export async function bankReferenceAction(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const ref = String(form.get("reference") ?? "").trim();
  const number = String(form.get("number") ?? "");
  const email = String(form.get("email") ?? "");
  if (ref.length < 4 || ref.length > 80) return { ok: false, message: "Enter the reference number from your bank receipt." };
  try {
    await submitBankReference(number, email, ref);
  } catch {
    return { ok: false, message: "We could not find that order." };
  }
  revalidatePath(`/order/${number}`);
  return { ok: true, message: "Thank you. We will verify your transfer and confirm your order by email." };
}
