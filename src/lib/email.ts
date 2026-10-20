import "server-only";
import { db } from "./db";

/**
 * Queues a transactional email. Messages land in the EmailOutbox table and are
 * delivered by `deliverOutbox()`. In development the "console" transport just
 * logs them. Plug a real provider (Resend, Postmark, SES…) into `send` below.
 */
export async function queueEmail(to: string, subject: string, body: string): Promise<void> {
  const row = await db.emailOutbox.create({ data: { to, subject, body } });
  // Fire-and-forget delivery attempt; failures stay in the outbox for retry.
  void deliver(row.id);
}

async function send(to: string, subject: string, body: string): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    console.info(`[email] to=${to} subject="${subject}"\n${body}\n`);
  }
}

async function deliver(id: string): Promise<void> {
  const row = await db.emailOutbox.findUnique({ where: { id } });
  if (!row || row.sentAt) return;
  try {
    await send(row.to, row.subject, row.body);
    await db.emailOutbox.update({ where: { id }, data: { sentAt: new Date(), error: null } });
  } catch (e) {
    await db.emailOutbox.update({ where: { id }, data: { error: String(e) } });
  }
}

export async function deliverOutbox(): Promise<number> {
  const pending = await db.emailOutbox.findMany({ where: { sentAt: null }, take: 50 });
  for (const p of pending) await deliver(p.id);
  return pending.length;
}
