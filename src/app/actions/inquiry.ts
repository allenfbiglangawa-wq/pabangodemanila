"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { nextNumber } from "@/lib/counters";
import { rateLimit } from "@/lib/rate-limit";
import { queueEmail } from "@/lib/email";
import { notifyAdmin } from "@/lib/notifications";
import { INQUIRY_TYPES } from "@/lib/constants";
import type { ActionState } from "./cart";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a contact number").max(20),
  eventType: z.enum(INQUIRY_TYPES as [string, ...string[]]),
  eventDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)) && new Date(s) > new Date(), "Choose a future date"),
  venue: z.string().trim().min(2, "Enter the venue or location").max(200),
  guestCount: z.string().optional(),
  venueSize: z.string().trim().max(120).optional(),
  fragranceStyle: z.string().trim().max(200).optional(),
  budgetRange: z.string().trim().max(80).optional(),
  requirements: z.string().trim().max(2000).optional(),
});

export async function submitInquiry(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (form.get("website")) return { ok: true, message: "Thank you." };
  if (!(await rateLimit("inquiry", 3, 60 * 60_000))) return { ok: false, message: "Too many inquiries. Please try again later or contact us directly." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (form.get("consent") !== "on") return { ok: false, message: "Please agree to be contacted about your inquiry." };
  const d = parsed.data;
  const guests = d.guestCount ? parseInt(d.guestCount, 10) : null;

  const inquiry = await db.$transaction(async (tx) => {
    const reference = await nextNumber(tx, "event", "EVT");
    const row = await tx.eventInquiry.create({
      data: {
        reference,
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        eventType: d.eventType,
        eventDate: new Date(d.eventDate),
        venue: d.venue,
        guestCount: guests && guests > 0 ? guests : null,
        venueSize: d.venueSize || null,
        fragranceStyle: d.fragranceStyle || null,
        budgetRange: d.budgetRange || null,
        requirements: d.requirements || null,
      },
    });
    await notifyAdmin(tx, "EVENT_INQUIRY", `New event scenting inquiry ${reference} — ${d.eventType}`, `/admin/events/${row.id}`);
    return row;
  });
  await queueEmail(
    d.email,
    `We received your event scenting inquiry (${inquiry.reference})`,
    `Hi ${d.fullName},\n\nThank you for your interest in event scenting. We have received your inquiry ${inquiry.reference} and will be in touch to discuss details and a quotation.\n\nThis is not yet a confirmed booking — bookings are confirmed once a quotation is accepted and any deposit is verified.\n`,
  );
  return { ok: true, message: `Thank you. Your inquiry reference is ${inquiry.reference}. We will be in touch soon.` };
}

export async function submitContact(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (form.get("website")) return { ok: true, message: "Thank you." };
  if (!(await rateLimit("contact", 5, 60 * 60_000))) return { ok: false, message: "Too many messages. Please try again later." };
  const parsed = z
    .object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email(), subject: z.string().trim().min(2).max(160), message: z.string().trim().min(10).max(4000) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Please fill in every field (message at least 10 characters)." };
  await db.contactMessage.create({ data: parsed.data });
  await notifyAdmin(db, "CONTACT", `New message from ${parsed.data.name}: ${parsed.data.subject}`, "/admin/customers?tab=messages");
  return { ok: true, message: "Thank you for your message. We will reply by email." };
}
