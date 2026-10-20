/** All amounts are integer centavos. */
const formatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

export function formatPHP(centavos: number): string {
  return formatter.format(centavos / 100);
}

/** Parses a pesos string like "1,250.50" into centavos. Returns null when invalid. */
export function pesosToCentavos(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = String(input).replace(/[₱,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

export function centavosToPesosInput(centavos: number | null | undefined): string {
  if (centavos == null) return "";
  return (centavos / 100).toFixed(2);
}

export function effectivePrice(v: { price: number; salePrice: number | null }): number {
  return v.salePrice != null && v.salePrice < v.price ? v.salePrice : v.price;
}
