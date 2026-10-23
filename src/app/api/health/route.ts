import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Deployment check: is the database configured and reachable? Never returns credentials. */
export async function GET() {
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  let target = "missing";
  try {
    if (raw) { const u = new URL(raw.replace(/["'\s]/g, "")); target = `${u.protocol}//${u.hostname}:${u.port || "default"}`; }
  } catch { target = "unparseable"; }
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: target, adapter: process.env.PRISMA_ADAPTER ?? "none" });
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).replace(/\/\/[^@\s]*@/g, "//***@").slice(0, 500);
    return NextResponse.json({ ok: false, database: target, adapter: process.env.PRISMA_ADAPTER ?? "none", error: message }, { status: 500 });
  }
}
