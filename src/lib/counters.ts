import type { Tx } from "./db";

/** Monotonic human-readable numbers (PDM-100001, EVT-100001). */
export async function nextNumber(tx: Tx, name: string, prefix: string): Promise<string> {
  const row = await tx.counter.upsert({
    where: { name },
    create: { name, value: 100001 },
    update: { value: { increment: 1 } },
  });
  return `${prefix}-${row.value}`;
}
