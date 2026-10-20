import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/payments";
import { confirmPayment, failPayment } from "@/lib/orders";

/**
 * Payment provider webhooks. Every event is signature-verified, recorded once
 * (provider + event id is unique, so retries are no-ops) and then reconciled
 * against the Payment row by idempotency key.
 */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await params;
  const provider = getProvider(providerId);
  if (!provider) return NextResponse.json({ error: "unknown provider" }, { status: 404 });

  const raw = await req.text();
  let event;
  try {
    event = await provider.verifyWebhook(raw, req.headers);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  try {
    await db.webhookEvent.create({ data: { provider: providerId, eventId: event.eventId, type: event.type, payload: raw } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const prior = await db.webhookEvent.findUnique({ where: { provider_eventId: { provider: providerId, eventId: event.eventId } } });
      if (prior?.processedAt) return NextResponse.json({ ok: true, duplicate: true });
    } else throw e;
  }

  if (event.idempotencyKey) {
    if (event.type === "payment.succeeded")
      await confirmPayment(event.idempotencyKey, { providerRef: event.providerRef, amount: event.amount, fee: event.fee, actor: `webhook:${providerId}` });
    else if (event.type === "payment.failed") await failPayment(event.idempotencyKey);
  }
  await db.webhookEvent.update({ where: { provider_eventId: { provider: providerId, eventId: event.eventId } }, data: { processedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
