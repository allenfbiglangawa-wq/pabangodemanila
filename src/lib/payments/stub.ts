import { hmac, safeEqual } from "../crypto";
import { siteUrl } from "../utils";
import type { PaymentProvider } from "./types";

/**
 * Development-only provider. It sends the customer to a local "hosted
 * checkout" simulator (/pay/simulator) which posts an HMAC-signed webhook
 * back to /api/webhooks/payments/stub — the same verify → reconcile path a
 * real provider uses. It refuses to run in production.
 */
export const stubProvider: PaymentProvider = {
  id: "stub",
  label: "Development payment simulator",
  async createCheckout(req) {
    if (process.env.NODE_ENV === "production") throw new Error("The stub payment provider cannot be used in production.");
    const ref = `stub_${req.paymentId}`;
    const sig = hmac(`${req.idempotencyKey}:${req.amount}`);
    const url = siteUrl(`/pay/simulator?key=${encodeURIComponent(req.idempotencyKey)}&amount=${req.amount}&order=${encodeURIComponent(req.orderNumber)}&method=${req.method}&sig=${sig}`);
    return { redirectUrl: url, providerRef: ref };
  },
  async verifyWebhook(rawBody, headers) {
    const sig = headers.get("x-stub-signature") ?? "";
    if (!safeEqual(sig, hmac(rawBody))) throw new Error("Invalid signature");
    const p = JSON.parse(rawBody) as { id: string; type: string; key: string; amount: number };
    return {
      eventId: p.id,
      type: p.type === "payment.succeeded" ? "payment.succeeded" : p.type === "payment.failed" ? "payment.failed" : "other",
      idempotencyKey: p.key,
      providerRef: `stub_${p.key}`,
      amount: p.amount,
      fee: 0,
    };
  },
};
