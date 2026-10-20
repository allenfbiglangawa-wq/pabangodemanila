import type { Tx } from "./db";

export async function notifyAdmin(tx: Tx, type: string, message: string, link?: string) {
  await tx.adminNotification.create({ data: { type, message, link } });
}
