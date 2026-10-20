import { NextResponse } from "next/server";
import { expireReservations } from "@/lib/orders";
import { deliverOutbox } from "@/lib/email";
import { safeEqual } from "@/lib/crypto";

/** Call every few minutes from a scheduler: `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const released = await expireReservations();
  const emails = await deliverOutbox();
  return NextResponse.json({ released, emails });
}
