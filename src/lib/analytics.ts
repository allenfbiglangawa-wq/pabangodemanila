import "server-only";
import { db } from "./db";
import { SALE_STATUSES } from "./constants";
import { getSetting } from "./settings";

export type Granularity = "day" | "week" | "month" | "year";

const TZ = "Asia/Manila";

/** YYYY-MM-DD in Manila time. */
export function manilaDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Start of a Manila calendar day as a UTC Date. */
export function manilaDayStart(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+08:00`);
}

export function bucketKey(d: Date, g: Granularity): string {
  const ymd = manilaDate(d);
  if (g === "day") return ymd;
  if (g === "month") return ymd.slice(0, 7);
  if (g === "year") return ymd.slice(0, 4);
  // ISO-ish week: Monday start
  const dt = manilaDayStart(ymd);
  const dow = (new Date(dt.getTime() + 8 * 3600_000).getUTCDay() + 6) % 7;
  return manilaDate(new Date(dt.getTime() - dow * 86400_000));
}

export interface SalesReport {
  from: Date;
  to: Date;
  orders: number;
  grossSales: number; // item subtotal before discounts
  discounts: number;
  refunds: number;
  netSales: number; // gross − discounts − refunds
  shippingCollected: number;
  shippingCosts: number;
  revenue: number; // net sales + shipping collected
  paymentFees: number;
  paymentFeesEstimated: boolean;
  cogs: number;
  cogsMissingItems: number; // sold lines without a recorded unit cost
  grossProfit: number; // net sales − COGS − payment fees − shipping costs + shipping collected
  aov: number;
  series: { key: string; revenue: number; orders: number }[];
  byProduct: { name: string; quantity: number; sales: number }[];
  byCategory: { name: string; quantity: number; sales: number }[];
  byPayment: { method: string; orders: number; total: number }[];
}

export async function salesReport(from: Date, to: Date, granularity: Granularity = "day"): Promise<SalesReport> {
  const commerce = await getSetting("commerce");
  const orders = await db.order.findMany({
    where: { status: { in: SALE_STATUSES }, OR: [{ paidAt: { gte: from, lt: to } }, { paidAt: null, paymentMethod: "COD", createdAt: { gte: from, lt: to } }] },
    include: { items: true, payments: true, refunds: true },
  });
  const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId)).filter(Boolean) as string[])];
  const products = await db.product.findMany({ where: { id: { in: productIds } }, include: { category: true } });
  const catOf = new Map(products.map((p) => [p.id, p.category?.name ?? "Uncategorised"]));

  let grossSales = 0, discounts = 0, refunds = 0, shippingCollected = 0, shippingCosts = 0, fees = 0, cogs = 0, cogsMissing = 0;
  let feesEstimated = false;
  const series = new Map<string, { revenue: number; orders: number }>();
  const byProduct = new Map<string, { quantity: number; sales: number }>();
  const byCategory = new Map<string, { quantity: number; sales: number }>();
  const byPayment = new Map<string, { orders: number; total: number }>();

  for (const o of orders) {
    const refunded = o.refunds.reduce((s, r) => s + r.amount, 0);
    grossSales += o.subtotal;
    discounts += o.discountTotal;
    refunds += refunded;
    shippingCollected += o.shippingFee;
    shippingCosts += o.shippingCost ?? 0;
    const recordedFees = o.payments.filter((p) => p.status === "SUCCEEDED" || p.status === "REFUNDED").reduce((s, p) => s + p.fee, 0);
    if (recordedFees === 0 && commerce.estimatedFeePercent > 0 && ["GCASH", "MAYA", "CARD"].includes(o.paymentMethod)) {
      fees += Math.round((o.total * commerce.estimatedFeePercent) / 100);
      feesEstimated = true;
    } else fees += recordedFees;

    for (const i of o.items) {
      const kept = i.quantity - i.refundedQuantity;
      if (i.unitCost == null) cogsMissing++;
      else cogs += i.unitCost * kept;
      const p = byProduct.get(i.productName) ?? { quantity: 0, sales: 0 };
      p.quantity += kept;
      p.sales += i.unitPrice * kept;
      byProduct.set(i.productName, p);
      const cname = (i.productId && catOf.get(i.productId)) || "Uncategorised";
      const c = byCategory.get(cname) ?? { quantity: 0, sales: 0 };
      c.quantity += kept;
      c.sales += i.unitPrice * kept;
      byCategory.set(cname, c);
    }
    const key = bucketKey(o.paidAt ?? o.createdAt, granularity);
    const b = series.get(key) ?? { revenue: 0, orders: 0 };
    b.revenue += o.total - refunded;
    b.orders += 1;
    series.set(key, b);
    const pm = byPayment.get(o.paymentMethod) ?? { orders: 0, total: 0 };
    pm.orders += 1;
    pm.total += o.total - refunded;
    byPayment.set(o.paymentMethod, pm);
  }

  // Fill empty buckets so the trend shows gaps honestly.
  const keys: string[] = [];
  for (let t = from.getTime(); t < to.getTime(); t += 86400_000) {
    const k = bucketKey(new Date(t), granularity);
    if (keys[keys.length - 1] !== k && !keys.includes(k)) keys.push(k);
  }
  const netSales = grossSales - discounts - refunds;
  const revenue = netSales + shippingCollected;
  return {
    from,
    to,
    orders: orders.length,
    grossSales,
    discounts,
    refunds,
    netSales,
    shippingCollected,
    shippingCosts,
    revenue,
    paymentFees: fees,
    paymentFeesEstimated: feesEstimated,
    cogs,
    cogsMissingItems: cogsMissing,
    grossProfit: netSales - cogs - fees + shippingCollected - shippingCosts,
    aov: orders.length ? Math.round(revenue / orders.length) : 0,
    series: keys.map((k) => ({ key: k, ...(series.get(k) ?? { revenue: 0, orders: 0 }) })),
    byProduct: [...byProduct].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sales - a.sales),
    byCategory: [...byCategory].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sales - a.sales),
    byPayment: [...byPayment].map(([method, v]) => ({ method, ...v })).sort((a, b) => b.total - a.total),
  };
}

/** Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive) or a preset range. */
export function parseRange(sp: { from?: string; to?: string; range?: string }): { from: Date; to: Date; label: string } {
  const today = manilaDate(new Date());
  const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (valid(sp.from) && valid(sp.to)) {
    return { from: manilaDayStart(sp.from!), to: new Date(manilaDayStart(sp.to!).getTime() + 86400_000), label: `${sp.from} to ${sp.to}` };
  }
  const end = new Date(manilaDayStart(today).getTime() + 86400_000);
  const days = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 }[sp.range ?? "30d"] ?? 30;
  if (sp.range === "mtd") return { from: manilaDayStart(today.slice(0, 8) + "01"), to: end, label: "Month to date" };
  if (sp.range === "ytd") return { from: manilaDayStart(today.slice(0, 5) + "01-01"), to: end, label: "Year to date" };
  return { from: new Date(end.getTime() - days * 86400_000), to: end, label: `Last ${days} days` };
}
