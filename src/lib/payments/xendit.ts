import type { PaymentProvider } from "./types";

/**
 * Xendit adapter — NOT YET IMPLEMENTED.
 *
 * To finish once the owner confirms Xendit:
 *  - createCheckout: create an Invoice / Payment Session with external_id =
 *    req.idempotencyKey, amount in pesos, payment methods GCASH, PAYMAYA, CARDS.
 *  - verifyWebhook: compare the `x-callback-token` header with
 *    XENDIT_WEBHOOK_TOKEN (constant-time), then map PAID / SETTLED to
 *    payment.succeeded and EXPIRED / FAILED to payment.failed.
 */
export const xenditProvider: PaymentProvider = {
  id: "xendit",
  label: "Xendit",
  async createCheckout() {
    throw new Error("Xendit is not configured yet. See src/lib/payments/xendit.ts.");
  },
  async verifyWebhook() {
    throw new Error("Xendit is not configured yet.");
  },
};
