"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { getSetting } from "@/lib/settings";
import { queueEmail } from "@/lib/email";
import { siteUrl } from "@/lib/utils";
import type { ActionState } from "./cart";

export async function subscribe(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (form.get("website")) return { ok: true, message: "Thank you." }; // honeypot
  if (!(await rateLimit("newsletter", 5, 60_000))) return { ok: false, message: "Too many attempts. Please try again shortly." };
  const email = z.string().email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { ok: false, message: "Please enter a valid email address." };
  if (form.get("consent") !== "on") return { ok: false, message: "Please tick the consent box to subscribe." };

  const { consentText } = await getSetting("newsletter");
  const existing = await db.newsletterSubscriber.findUnique({ where: { email: email.data } });
  const token = existing?.unsubscribeToken ?? randomToken(24);
  await db.newsletterSubscriber.upsert({
    where: { email: email.data },
    create: { email: email.data, consentText, consentAt: new Date(), source: String(form.get("source") ?? "website"), unsubscribeToken: token },
    update: { status: "SUBSCRIBED", consentText, consentAt: new Date(), unsubscribedAt: null },
  });
  await queueEmail(
    email.data,
    "Welcome to Pabango de Manila",
    `Thank you for subscribing.\n\nYou can unsubscribe at any time: ${siteUrl(`/newsletter/unsubscribe?token=${token}`)}\n`,
  );
  return { ok: true, message: "Thank you for subscribing." };
}
