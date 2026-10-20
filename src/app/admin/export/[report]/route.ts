import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { available } from "@/lib/inventory";
import { parseRange, salesReport, manilaDate } from "@/lib/analytics";
import { ORDER_STATUS_LABEL, SALE_STATUSES, type OrderStatus } from "@/lib/constants";

type Row = (string | number | null | undefined)[];
const peso = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));

function csvCell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // prevent spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function respond(name: string, header: string[], rows: Row[], format: string) {
  const stamp = manilaDate(new Date());
  if (format === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(name.slice(0, 31));
    ws.addRow(header).font = { bold: true };
    rows.forEach((r) => ws.addRow(r.map((v) => (typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v ?? ""))));
    ws.columns.forEach((c) => (c.width = 18));
    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf, {
      headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="pabango-${name}-${stamp}.xlsx"` },
    });
  }
  const body = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="pabango-${name}-${stamp}.csv"` } });
}

export async function GET(req: Request, { params }: { params: Promise<{ report: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return new Response("Unauthorized", { status: 401 });
  const { report } = await params;
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams);
  const format = sp.format === "xlsx" ? "xlsx" : "csv";

  switch (report) {
    case "orders": {
      const orders = await db.order.findMany({ where: sp.status && sp.status !== "open" ? { status: sp.status } : {}, include: { items: true }, orderBy: { createdAt: "desc" } });
      return respond("orders", ["Order", "Date", "Status", "Customer", "Email", "Phone", "City", "Region", "Payment", "Items", "Subtotal", "Discount", "Shipping", "Total", "Refunded"],
        orders.map((o) => [o.number, o.createdAt.toISOString(), ORDER_STATUS_LABEL[o.status as OrderStatus], o.fullName, o.email, o.phone, o.city, o.region, o.paymentMethod, o.items.map((i) => `${i.quantity}x ${i.sku}`).join("; "), peso(o.subtotal), peso(o.discountTotal), peso(o.shippingFee), peso(o.total), peso(o.refundedTotal)]), format);
    }
    case "inventory": {
      const vs = await db.productVariant.findMany({ include: { product: true }, orderBy: { sku: "asc" } });
      return respond("inventory", ["sku", "product", "variant", "on_hand", "reserved", "available", "low_stock_threshold", "unit_cost", "stock_value", "barcode"],
        vs.map((v) => [v.sku, v.product.name, v.name, v.stockOnHand, v.stockReserved, available(v), v.lowStockThreshold, peso(v.cost), v.cost != null ? peso(v.cost * v.stockOnHand) : "", v.barcode]), format);
    }
    case "movements": {
      const ms = await db.inventoryMovement.findMany({ include: { variant: true, admin: true }, orderBy: { createdAt: "desc" }, take: 20000 });
      return respond("stock-movements", ["Date", "SKU", "Type", "Change", "Prev on hand", "New on hand", "Prev reserved", "New reserved", "Reason", "By", "Order"],
        ms.map((m) => [m.createdAt.toISOString(), m.variant.sku, m.type, m.quantityChange, m.previousOnHand, m.newOnHand, m.previousReserved, m.newReserved, m.reason, m.admin?.email ?? "", m.orderId ?? ""]), format);
    }
    case "customers": {
      const us = await db.user.findMany({ where: { role: "CUSTOMER" }, include: { orders: { where: { status: { in: SALE_STATUSES } } } } });
      return respond("customers", ["Name", "Email", "Phone", "Joined", "Orders", "Spent", "Marketing consent"],
        us.map((u) => [u.name, u.email, u.phone, u.createdAt.toISOString(), u.orders.length, peso(u.orders.reduce((s, o) => s + o.total - o.refundedTotal, 0)), u.marketingConsent ? "yes" : "no"]), format);
    }
    case "subscribers": {
      const subs = await db.newsletterSubscriber.findMany({ where: { status: "SUBSCRIBED" } });
      return respond("subscribers", ["Email", "Consented at", "Source", "Consent text"], subs.map((s) => [s.email, s.consentAt.toISOString(), s.source, s.consentText]), format);
    }
    case "events": {
      const es = await db.eventInquiry.findMany({ orderBy: { eventDate: "asc" } });
      return respond("event-bookings", ["Ref", "Status", "Client", "Email", "Phone", "Event type", "Event date", "Venue", "Guests", "Quote", "Deposit required", "Deposit paid", "Balance paid"],
        es.map((e) => [e.reference, e.status, e.fullName, e.email, e.phone, e.eventType, manilaDate(e.eventDate), e.venue, e.guestCount, peso(e.quotationAmount), peso(e.depositRequired), peso(e.depositPaid), peso(e.balancePaid)]), format);
    }
    case "sales": {
      const { from, to, label } = parseRange(sp);
      const r = await salesReport(from, to, (sp.g as "day") || "day");
      const rows: Row[] = [
        ["Period", label],
        ["Orders", r.orders],
        ["Gross sales", peso(r.grossSales)],
        ["Discounts", peso(r.discounts)],
        ["Refunds", peso(r.refunds)],
        ["Net sales", peso(r.netSales)],
        ["Shipping collected", peso(r.shippingCollected)],
        ["Shipping costs", peso(r.shippingCosts)],
        ["Revenue", peso(r.revenue)],
        ["Payment fees", peso(r.paymentFees)],
        ["Cost of goods sold", peso(r.cogs)],
        ["Estimated gross profit", peso(r.grossProfit)],
        ["Average order value", peso(r.aov)],
        [],
        ["Period", "Revenue", "Orders"],
        ...r.series.map((s) => [s.key, peso(s.revenue), s.orders]),
        [],
        ["Product", "Units", "Sales"],
        ...r.byProduct.map((p) => [p.name, p.quantity, peso(p.sales)]),
        [],
        ["Category", "Units", "Sales"],
        ...r.byCategory.map((p) => [p.name, p.quantity, peso(p.sales)]),
      ];
      return respond("sales-report", ["Metric", "Value", ""], rows, format);
    }
  }
  return new Response("Unknown report", { status: 404 });
}
