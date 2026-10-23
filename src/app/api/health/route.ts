import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Deployment check: is the database configured and reachable? Never returns credentials. */
export async function GET() {
  // Which runtime settings exist (true/false only).
  const settings = Object.fromEntries(["APP_SECRET", "CRON_SECRET", "SITE_URL"].map((k) => [k, !!process.env[k]]));
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  let target = "missing";
  try {
    if (raw) { const u = new URL(raw.replace(/["'\s]/g, "")); target = `${u.protocol}//${u.hostname}:${u.port || "default"}`; }
  } catch { target = "unparseable"; }
  try {
    await db.$queryRaw`SELECT 1`;
    // Dashboard accounts, masked (helps when an owner cannot sign in).
    const staff = await db.user.findMany({ where: { role: { in: ["ADMIN", "STAFF"] } }, select: { email: true, role: true, passwordHash: true, updatedAt: true } });
    const admins = staff.map((u) => ({
      email: u.email.replace(/^(.)[^@]*(.)@/, "$1***$2@"),
      role: u.role,
      passwordType: u.passwordHash.slice(0, 7),
      updatedAt: u.updatedAt.toISOString(),
    }));
    return NextResponse.json({ ok: true, database: target, adapter: process.env.PRISMA_ADAPTER ?? "none", settings, admins });
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).replace(/\/\/[^@\s]*@/g, "//***@").slice(0, 500);
    return NextResponse.json({ ok: false, database: target, adapter: process.env.PRISMA_ADAPTER ?? "none", settings, error: message }, { status: 500 });
  }
}
