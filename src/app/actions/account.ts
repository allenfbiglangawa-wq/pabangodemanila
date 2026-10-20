"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, hashPassword, passwordProblem, requireUser, verifyPassword, isStaff } from "@/lib/auth";
import { readCartId } from "@/lib/cart";
import { randomToken, sha256 } from "@/lib/crypto";
import { queueEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { notifyAdmin } from "@/lib/notifications";
import { PH_REGIONS } from "@/lib/constants";
import { safeRedirectPath, siteUrl } from "@/lib/utils";
import type { ActionState } from "./cart";

async function attachGuestCart(userId: string) {
  const cartId = await readCartId();
  if (cartId) await db.cart.updateMany({ where: { id: cartId, userId: null }, data: { userId } });
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await rateLimit("login", 8, 15 * 60_000))) return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  // Compare against a dummy hash when the user doesn't exist to keep timing uniform.
  const ok = await verifyPassword(password, user?.passwordHash ?? "$2b$12$7K.DH51Tx5YUH/ul8oQBqecmRPT.a3iaSYpWToaviC8NNStRUmmjK");
  if (!user || !ok) return { ok: false, message: "Email or password is incorrect." };
  if (form.get("admin") === "1" && !isStaff(user.role)) return { ok: false, message: "This account does not have dashboard access." };
  await createSession(user.id);
  await attachGuestCart(user.id);
  const fallback = form.get("admin") === "1" && isStaff(user.role) ? "/admin" : "/account";
  redirect(safeRedirectPath(String(form.get("next") ?? ""), fallback));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string(),
});

export async function registerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await rateLimit("register", 5, 60 * 60_000))) return { ok: false, message: "Too many attempts. Please try later." };
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const problem = passwordProblem(parsed.data.password);
  if (problem) return { ok: false, message: problem };
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) return { ok: false, message: "An account with this email already exists. Try signing in." };
  const user = await db.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), marketingConsent: form.get("marketing") === "on" },
  });
  // Link earlier guest orders placed with this email.
  await db.order.updateMany({ where: { email: user.email, userId: null }, data: { userId: user.id } });
  await createSession(user.id);
  await attachGuestCart(user.id);
  redirect(safeRedirectPath(String(form.get("next") ?? ""), "/account"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await rateLimit("forgot", 5, 60 * 60_000))) return { ok: false, message: "Too many requests. Please try later." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const token = randomToken();
    await db.passwordResetToken.create({ data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60_000) } });
    await queueEmail(user.email, "Reset your password", `Reset your Pabango de Manila password (valid for 1 hour):\n${siteUrl(`/account/reset?token=${token}`)}\n\nIf you didn’t ask for this, ignore this email.`);
  }
  return { ok: true, message: "If an account exists for that email, we have sent a reset link." };
}

export async function resetPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { ok: false, message: problem };
  const row = await db.passwordResetToken.findUnique({ where: { id: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { ok: false, message: "This reset link is invalid or has expired." };
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  return { ok: true, message: "Your password has been updated. You can now sign in." };
}

export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim() || null;
  if (name.length < 2) return { ok: false, message: "Enter your name." };
  await db.user.update({ where: { id: user.id }, data: { name, phone, marketingConsent: form.get("marketing") === "on" } });
  const current = String(form.get("currentPassword") ?? "");
  const next = String(form.get("newPassword") ?? "");
  if (next) {
    if (!(await verifyPassword(current, user.passwordHash))) return { ok: false, message: "Current password is incorrect." };
    const problem = passwordProblem(next);
    if (problem) return { ok: false, message: problem };
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  }
  revalidatePath("/account/profile");
  return { ok: true, message: "Profile saved." };
}

export async function requestDeletionAction() {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { deletionRequestedAt: new Date() } });
  await notifyAdmin(db, "ACCOUNT_DELETION", `Account deletion requested by ${user.email}`, "/admin/customers");
  await queueEmail(user.email, "We received your account deletion request", "We will delete your account and personal data within 30 days, keeping only what the law requires us to retain for orders.");
  revalidatePath("/account/profile");
}

const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(20),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  barangay: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  province: z.string().trim().min(2).max(120),
  region: z.enum(PH_REGIONS as [string, ...string[]]),
  postalCode: z.string().trim().regex(/^\d{4}$/),
});

export async function saveAddressAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: `Please check ${String(parsed.error.issues[0].path[0])}.` };
  const d = { ...parsed.data, label: parsed.data.label || null, line2: parsed.data.line2 || null };
  const isDefault = form.get("isDefault") === "on" || (await db.address.count({ where: { userId: user.id } })) === 0;
  if (isDefault) await db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  await db.address.create({ data: { ...d, userId: user.id, isDefault } });
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddressAction(form: FormData) {
  const user = await requireUser();
  await db.address.deleteMany({ where: { id: String(form.get("id")), userId: user.id } });
  revalidatePath("/account/addresses");
}

export async function currentUserName() {
  return (await getCurrentUser())?.name ?? null;
}
