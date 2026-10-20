export interface CheckoutRequest {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  idempotencyKey: string;
  amount: number; // centavos
  method: "GCASH" | "MAYA" | "CARD";
  customer: { name: string; email: string; phone: string };
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  /** Provider-hosted page the customer is sent to. Card details are only ever entered there. */
  redirectUrl: string;
  providerRef: string;
}

export interface VerifiedPaymentEvent {
  eventId: string;
  type: "payment.succeeded" | "payment.failed" | "other";
  idempotencyKey: string | null;
  providerRef: string | null;
  amount: number | null;
  fee: number;
}

export interface PaymentProvider {
  id: string;
  label: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Verifies the webhook signature and normalises the payload. Throws when the signature is invalid. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent>;
}
