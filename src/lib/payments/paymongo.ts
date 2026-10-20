import type { PaymentProvider } from "./types";

/**
 * PayMongo adapter — NOT YET IMPLEMENTED.
 *
 * To finish once the owner confirms PayMongo (merchant approval, fees, enabled methods):
 *  - createCheckout: POST https://api.paymongo.com/v1/checkout_sessions with
 *    payment_method_types ["gcash","paymaya","card"], line item = order total,
 *    reference_number = order number, metadata.idempotency_key = req.idempotencyKey,
 *    success_url / cancel_url. Return data.attributes.checkout_url.
 *  - verifyWebhook: validate the `Paymongo-Signature` header (t=…,te=…,li=…)
 *    as HMAC-SHA256 of `${t}.${rawBody}` with PAYMONGO_WEBHOOK_SECRET, reject
 *    stale timestamps, map "checkout_session.payment.paid" → payment.succeeded
 *    and read the fee from the payment attributes.
 */
export const paymongoProvider: PaymentProvider = {
  id: "paymongo",
  label: "PayMongo",
  async createCheckout() {
    throw new Error("PayMongo is not configured yet. See src/lib/payments/paymongo.ts.");
  },
  async verifyWebhook() {
    throw new Error("PayMongo is not configured yet.");
  },
};
