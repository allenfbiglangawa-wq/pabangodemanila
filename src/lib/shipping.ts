import type { Tx } from "./db";

export interface ShippingQuote {
  fee: number;
  ruleName: string | null;
  configured: boolean;
}

/**
 * Shipping fee from owner-configured rules: a region-specific rule wins,
 * otherwise the default (region = null) rule. Courier API integration can
 * replace this later behind the same signature.
 */
export async function quoteShipping(tx: Tx, region: string | null, subtotal: number): Promise<ShippingQuote> {
  const rules = await tx.shippingRule.findMany({ where: { isActive: true } });
  const rule = (region && rules.find((r) => r.region === region)) || rules.find((r) => r.region == null);
  if (!rule) return { fee: 0, ruleName: null, configured: false };
  const free = rule.freeOverSubtotal != null && subtotal >= rule.freeOverSubtotal;
  return { fee: free ? 0 : rule.fee, ruleName: rule.name, configured: true };
}
