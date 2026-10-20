import { paymongoProvider } from "./paymongo";
import { stubProvider } from "./stub";
import type { PaymentProvider } from "./types";
import { xenditProvider } from "./xendit";

const providers: Record<string, PaymentProvider> = {
  stub: stubProvider,
  paymongo: paymongoProvider,
  xendit: xenditProvider,
};

export function getProvider(id: string): PaymentProvider | null {
  return providers[id] ?? null;
}

/** The provider used for GCash, Maya and card payments. */
export function onlineProvider(): PaymentProvider {
  const id = process.env.PAYMENT_PROVIDER || "stub";
  const p = providers[id];
  if (!p) throw new Error(`Unknown PAYMENT_PROVIDER "${id}"`);
  return p;
}

/**
 * Whether a real online provider can take payments here. The stub only works
 * in development, so a production site with PAYMENT_PROVIDER unset or "stub"
 * hides GCash, Maya and card payments instead of failing at checkout.
 */
export function onlinePaymentsReady(): boolean {
  const id = process.env.PAYMENT_PROVIDER || "stub";
  if (!(id in providers)) return false;
  return !(id === "stub" && process.env.NODE_ENV === "production");
}
