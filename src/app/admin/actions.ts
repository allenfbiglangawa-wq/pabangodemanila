"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, passwordProblem, requireAdmin } from "@/lib/auth";
import * as inventory from "@/lib/inventory";
import { refundOrder, transitionOrder } from "@/lib/orders";
import { saveSetting, getSetting, SETTING_DEFAULTS, type SettingKey } from "@/lib/settings";
import { saveUpload, deleteUpload, UploadError } from "@/lib/storage";
import { queueEmail } from "@/lib/email";
import { pesosToCentavos, formatPHP } from "@/lib/money";
import { bool, int, optStr, slugify, str } from "@/lib/utils";
import { EVENT_TRANSITIONS, ORDER_STATUSES, type EventStatus, type OrderStatus } from "@/lib/constants";

function back(path: string, msg: { ok?: string; error?: string }): never {
  const sep = path.includes("?") ? "&" : "?";
  const q = msg.error ? `error=${encodeURIComponent(msg.error)}` : `ok=${encodeURIComponent(msg.ok ?? "Saved")}`;
  revalidatePath("/", "layout");
  redirect(`${path}${sep}${q}`);
}

async function run(path: string, fn: () => Promise<string | void>): Promise<never> {
  let msg: string | void;
  try {
    msg = await fn();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    back(path, { error: e instanceof Error ? e.message : "Something went wrong" });
  }
  back(path, { ok: msg || "Saved" });
}

const money = (form: FormData, key: string) => pesosToCentavos(str(form, key));

// ─── Orders ────────────────────────────────────────────────────────────────

export async function updateOrderStatus(form: FormData) {
  const admin = await requireAdmin();
  const number = str(form, "number");
  await run(`/admin/orders/${number}`, async () => {
    const to = str(form, "to") as OrderStatus;
    if (!ORDER_STATUSES.includes(to)) throw new Error("Invalid status");
    const order = await db.order.findUniqueOrThrow({ where: { number } });
    await transitionOrder(order.id, to, admin.email, optStr(form, "note") ?? undefined, { trackingNumber: optStr(form, "trackingNumber") ?? undefined, courier: optStr(form, "courier") ?? undefined });
    return "Order updated";
  });
}

export async function saveOrderShipping(form: FormData) {
  await requireAdmin();
  const number = str(form, "number");
  await run(`/admin/orders/${number}`, async () => {
    await db.order.update({ where: { number }, data: { trackingNumber: optStr(form, "trackingNumber"), courier: optStr(form, "courier"), shippingCost: money(form, "shippingCost") } });
    return "Shipping details saved";
  });
}

export async function refundOrderAction(form: FormData) {
  const admin = await requireAdmin({ ownerOnly: true });
  const number = str(form, "number");
  await run(`/admin/orders/${number}`, async () => {
    const order = await db.order.findUniqueOrThrow({ where: { number }, include: { items: true } });
    const amount = money(form, "amount");
    if (!amount) throw new Error("Enter a refund amount");
    const restock = order.items.map((i) => ({ orderItemId: i.id, quantity: int(form, `restock_${i.id}`, 0) }));
    await refundOrder({ orderId: order.id, amount, reason: str(form, "reason") || "Refund", restock, actor: { id: admin.id, email: admin.email } });
    return `Refund of ${formatPHP(amount)} recorded. Return the money through your payment provider or bank.`;
  });
}

// ─── Products ──────────────────────────────────────────────────────────────

export async function saveProduct(form: FormData) {
  await requireAdmin();
  const id = optStr(form, "id");
  const name = str(form, "name");
  const path = id ? `/admin/products/${id}` : "/admin/products/new";
  let newId = id;
  await (async () => {
    try {
      if (name.length < 2) throw new Error("Name is required");
      const data = {
        name,
        slug: slugify(str(form, "slug") || name),
        description: str(form, "description"),
        fragranceFamily: optStr(form, "fragranceFamily"),
        topNotes: optStr(form, "topNotes"),
        heartNotes: optStr(form, "heartNotes"),
        baseNotes: optStr(form, "baseNotes"),
        categoryId: optStr(form, "categoryId"),
        status: ["DRAFT", "ACTIVE", "ARCHIVED"].includes(str(form, "status")) ? str(form, "status") : "DRAFT",
        isFeatured: bool(form, "isFeatured"),
        isBestseller: bool(form, "isBestseller"),
        isNewArrival: bool(form, "isNewArrival"),
        isPlaceholder: bool(form, "isPlaceholder"),
        videoUrl: optStr(form, "videoUrl"),
        shippingInfo: optStr(form, "shippingInfo"),
        seoTitle: optStr(form, "seoTitle"),
        seoDescription: optStr(form, "seoDescription"),
      };
      if (id) await db.product.update({ where: { id }, data });
      else newId = (await db.product.create({ data })).id;
    } catch (e) {
      const msg = e instanceof Error && e.message.includes("Unique constraint") ? "Another product already uses that URL slug" : e instanceof Error ? e.message : "Could not save";
      back(path, { error: msg });
    }
  })();
  back(`/admin/products/${newId}`, { ok: "Product saved" });
}

export async function saveVariant(form: FormData) {
  const admin = await requireAdmin();
  const productId = str(form, "productId");
  await run(`/admin/products/${productId}`, async () => {
    const id = optStr(form, "id");
    const price = money(form, "price");
    if (price == null) throw new Error("Enter a price");
    const data = {
      name: str(form, "name") || "Default",
      sku: str(form, "sku").toUpperCase(),
      price,
      salePrice: money(form, "salePrice"),
      cost: money(form, "cost"),
      lowStockThreshold: int(form, "lowStockThreshold", 5),
      isActive: bool(form, "isActive"),
      barcode: optStr(form, "barcode"),
    };
    if (!data.sku) throw new Error("SKU is required");
    if (data.salePrice != null && data.salePrice >= price) throw new Error("Sale price must be lower than the price");
    if (id) await db.productVariant.update({ where: { id }, data });
    else {
      const v = await db.productVariant.create({ data: { ...data, productId, stockOnHand: 0 } });
      const opening = int(form, "openingStock", 0);
      if (opening > 0) await db.$transaction((tx) => inventory.adjust(tx, v.id, opening, "RESTOCK", "Opening stock", admin.id));
    }
    return "Variant saved";
  });
}

export async function uploadProductImage(form: FormData) {
  await requireAdmin();
  const productId = str(form, "productId");
  await run(`/admin/products/${productId}`, async () => {
    const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new Error("Choose at least one image");
    const count = await db.productImage.count({ where: { productId } });
    for (const [i, f] of files.entries()) {
      try {
        const up = await saveUpload(f, ["image"]);
        await db.productImage.create({ data: { productId, url: up.url, alt: str(form, "alt"), sortOrder: count + i } });
        await db.mediaAsset.create({ data: { url: up.url, filename: f.name, mimeType: up.mimeType, sizeBytes: up.sizeBytes, alt: str(form, "alt") } });
      } catch (e) {
        if (e instanceof UploadError) throw new Error(`${f.name}: ${e.message}`);
        throw e;
      }
    }
    return "Images uploaded";
  });
}

export async function addProductImageFromLibrary(form: FormData) {
  await requireAdmin();
  const productId = str(form, "productId");
  await run(`/admin/products/${productId}`, async () => {
    const url = str(form, "url");
    if (!url.startsWith("/")) throw new Error("Choose an image from the media library");
    const count = await db.productImage.count({ where: { productId } });
    await db.productImage.create({ data: { productId, url, alt: str(form, "alt"), sortOrder: count } });
    return "Image added";
  });
}

export async function removeProductImage(form: FormData) {
  await requireAdmin();
  const productId = str(form, "productId");
  await run(`/admin/products/${productId}`, async () => {
    await db.productImage.deleteMany({ where: { id: str(form, "imageId"), productId } });
    return "Image removed";
  });
}

export async function makePrimaryImage(form: FormData) {
  await requireAdmin();
  const productId = str(form, "productId");
  await run(`/admin/products/${productId}`, async () => {
    const images = await db.productImage.findMany({ where: { productId }, orderBy: { sortOrder: "asc" } });
    const id = str(form, "imageId");
    const ordered = [images.find((i) => i.id === id)!, ...images.filter((i) => i.id !== id)];
    await db.$transaction(ordered.map((img, i) => db.productImage.update({ where: { id: img.id }, data: { sortOrder: i } })));
    return "Primary image updated";
  });
}

export async function saveCategory(form: FormData) {
  await requireAdmin();
  await run("/admin/products?tab=categories", async () => {
    const id = optStr(form, "id");
    const name = str(form, "name");
    if (!name) throw new Error("Name is required");
    const data = { name, slug: slugify(str(form, "slug") || name), description: optStr(form, "description"), imageUrl: optStr(form, "imageUrl"), sortOrder: int(form, "sortOrder"), isActive: bool(form, "isActive") };
    if (id) await db.category.update({ where: { id }, data });
    else await db.category.create({ data });
    return "Category saved";
  });
}

// ─── Inventory ─────────────────────────────────────────────────────────────

export async function adjustStock(form: FormData) {
  const admin = await requireAdmin();
  const back_ = str(form, "back") || "/admin/inventory";
  await run(back_, async () => {
    const variantId = str(form, "variantId");
    const mode = str(form, "mode");
    const qty = int(form, "quantity", NaN);
    const reason = str(form, "reason");
    if (!Number.isFinite(qty)) throw new Error("Enter a quantity");
    if (reason.length < 3) throw new Error("A reason is required for every stock change");
    await db.$transaction(async (tx) => {
      const v = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });
      const delta = mode === "set" ? qty - v.stockOnHand : mode === "remove" ? -Math.abs(qty) : Math.abs(qty);
      await inventory.adjust(tx, variantId, delta, mode === "add" ? "RESTOCK" : "ADJUSTMENT", reason, admin.id);
    });
    return "Stock updated";
  });
}

export async function importInventoryCsv(form: FormData) {
  const admin = await requireAdmin({ ownerOnly: true });
  await run("/admin/inventory", async () => {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file");
    if (file.size > 2 * 1024 * 1024) throw new Error("CSV must be under 2 MB");
    const rows = parseCsv(await file.text());
    const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
    const iSku = header.indexOf("sku"), iOnHand = header.indexOf("on_hand"), iThreshold = header.indexOf("low_stock_threshold"), iCost = header.indexOf("unit_cost");
    if (iSku < 0 || iOnHand < 0) throw new Error("CSV needs at least the columns sku and on_hand (export first to get the template)");
    let updated = 0;
    const missing: string[] = [];
    await db.$transaction(async (tx) => {
      for (const r of rows) {
        const sku = r[iSku]?.trim().toUpperCase();
        if (!sku) continue;
        const v = await tx.productVariant.findUnique({ where: { sku } });
        if (!v) { missing.push(sku); continue; }
        const onHand = parseInt(r[iOnHand], 10);
        if (Number.isFinite(onHand) && onHand !== v.stockOnHand) await inventory.adjust(tx, v.id, onHand - v.stockOnHand, "IMPORT", "CSV import", admin.id);
        const data: { lowStockThreshold?: number; cost?: number | null } = {};
        if (iThreshold >= 0 && r[iThreshold]?.trim()) data.lowStockThreshold = parseInt(r[iThreshold], 10);
        if (iCost >= 0 && r[iCost]?.trim()) data.cost = pesosToCentavos(r[iCost]);
        if (Object.keys(data).length) await tx.productVariant.update({ where: { id: v.id }, data });
        updated++;
      }
    }, { timeout: 60_000 });
    return `Imported ${updated} rows${missing.length ? `. Unknown SKUs skipped: ${missing.slice(0, 10).join(", ")}` : ""}`;
  });
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

// ─── Events ────────────────────────────────────────────────────────────────

export async function updateEventStatus(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  await run(`/admin/events/${id}`, async () => {
    const e = await db.eventInquiry.findUniqueOrThrow({ where: { id } });
    const to = str(form, "to") as EventStatus;
    if (!EVENT_TRANSITIONS[e.status as EventStatus]?.includes(to)) throw new Error("That status change is not allowed");
    if (to === "QUOTATION_SENT" && !e.quotationAmount) throw new Error("Save a quotation amount first");
    if (to === "CONFIRMED" && (e.depositRequired ?? 0) > e.depositPaid) throw new Error("Record the deposit before confirming the booking");
    await db.eventInquiry.update({ where: { id }, data: { status: to } });
    await db.eventNote.create({ data: { inquiryId: id, body: `Status changed to ${to.replace(/_/g, " ").toLowerCase()}${optStr(form, "note") ? `: ${str(form, "note")}` : ""}`, author: admin.email } });
    if (bool(form, "notify")) {
      const lines: Record<string, string> = {
        QUOTATION_SENT: `Your quotation for ${e.eventType} on ${e.eventDate.toDateString()} is ${formatPHP(e.quotationAmount ?? 0)}${e.depositRequired ? `, with a deposit of ${formatPHP(e.depositRequired)}` : ""}.`,
        DEPOSIT_PENDING: `To secure your date, please settle the deposit of ${formatPHP(e.depositRequired ?? 0)}.`,
        CONFIRMED: "Your event scenting booking is confirmed. Thank you!",
        DECLINED: "Thank you for your interest. Unfortunately we are unable to take this booking.",
      };
      if (lines[to]) await queueEmail(e.email, `Your event scenting inquiry ${e.reference}`, `Hi ${e.fullName},\n\n${lines[to]}\n${optStr(form, "note") ?? ""}\n`);
    }
    return "Booking updated";
  });
}

export async function saveEventQuote(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  await run(`/admin/events/${id}`, async () => {
    const before = await db.eventInquiry.findUniqueOrThrow({ where: { id } });
    const quotationAmount = money(form, "quotationAmount");
    const depositRequired = money(form, "depositRequired");
    const depositPaid = money(form, "depositPaid") ?? 0;
    const balancePaid = money(form, "balancePaid") ?? 0;
    await db.eventInquiry.update({ where: { id }, data: { quotationAmount, depositRequired, depositPaid, balancePaid } });
    if (depositPaid !== before.depositPaid || balancePaid !== before.balancePaid)
      await db.eventNote.create({ data: { inquiryId: id, body: `Payments recorded — deposit ${formatPHP(depositPaid)}, balance ${formatPHP(balancePaid)}`, author: admin.email } });
    return "Quotation and payments saved";
  });
}

export async function addEventNote(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  await run(`/admin/events/${id}`, async () => {
    const body = str(form, "body");
    if (!body) throw new Error("Write a note");
    await db.eventNote.create({ data: { inquiryId: id, body, author: admin.email } });
    return "Note added";
  });
}

// ─── Reviews ───────────────────────────────────────────────────────────────

export async function moderateReview(form: FormData) {
  await requireAdmin();
  await run(`/admin/reviews?filter=${str(form, "filter") || "pending"}`, async () => {
    const id = str(form, "id");
    const decision = str(form, "decision");
    if (decision === "approve" || decision === "reject") {
      await db.review.update({ where: { id }, data: { status: decision === "approve" ? "APPROVED" : "REJECTED", moderationNote: optStr(form, "moderationNote") } });
      await db.reviewReport.updateMany({ where: { reviewId: id }, data: { resolved: true } });
    }
    if (decision === "respond") await db.review.update({ where: { id }, data: { adminResponse: optStr(form, "adminResponse") } });
    if (decision === "homepage") {
      const r = await db.review.findUniqueOrThrow({ where: { id } });
      if (r.status !== "APPROVED") throw new Error("Only approved reviews can be featured");
      await db.review.update({ where: { id }, data: { showOnHomepage: !r.showOnHomepage } });
    }
    if (decision === "dismiss-reports") await db.reviewReport.updateMany({ where: { reviewId: id }, data: { resolved: true } });
    return "Review updated";
  });
}

// ─── Promotions ────────────────────────────────────────────────────────────

export async function saveDiscount(form: FormData) {
  await requireAdmin({ ownerOnly: true });
  await run("/admin/promotions", async () => {
    const id = optStr(form, "id");
    const type = str(form, "type") === "PERCENT" ? "PERCENT" : "FIXED";
    const value = type === "PERCENT" ? int(form, "value") : money(form, "value");
    if (!value || value <= 0 || (type === "PERCENT" && value > 100)) throw new Error("Enter a valid discount value");
    const data = {
      code: str(form, "code").toUpperCase().replace(/\s/g, ""),
      description: optStr(form, "description"),
      type,
      value,
      minSubtotal: money(form, "minSubtotal") ?? 0,
      startsAt: optStr(form, "startsAt") ? new Date(`${str(form, "startsAt")}T00:00:00+08:00`) : null,
      endsAt: optStr(form, "endsAt") ? new Date(`${str(form, "endsAt")}T23:59:59+08:00`) : null,
      usageLimit: optStr(form, "usageLimit") ? int(form, "usageLimit") : null,
      isActive: bool(form, "isActive"),
    };
    if (!/^[A-Z0-9_-]{3,30}$/.test(data.code)) throw new Error("Codes use 3–30 letters, numbers, - or _");
    if (id) await db.discountCode.update({ where: { id }, data });
    else await db.discountCode.create({ data });
    return "Discount code saved";
  });
}

// ─── Content & settings ────────────────────────────────────────────────────

export async function saveSettingGroup(form: FormData) {
  const admin = await requireAdmin();
  const key = str(form, "key") as SettingKey;
  const backTo = str(form, "back") || "/admin/content";
  await run(backTo, async () => {
    if (!(key in SETTING_DEFAULTS)) throw new Error("Unknown settings group");
    if ((key === "commerce" || key === "seo") && admin.role !== "ADMIN") throw new Error("Only the owner can change these settings");
    const current = (await getSetting(key)) as Record<string, unknown>;
    const next: Record<string, unknown> = { ...current };
    for (const [field, def] of Object.entries(SETTING_DEFAULTS[key] as Record<string, unknown>)) {
      if (typeof def === "boolean") next[field] = bool(form, field);
      else if (typeof def === "number") next[field] = Number(str(form, field)) || 0;
      else if (typeof def === "string") { if (form.has(field)) next[field] = str(form, field); }
      else if (Array.isArray(def) && form.has(field)) {
        const raw = str(form, field);
        if (field === "faqs") next[field] = raw.split(/\n\s*\n/).map((block) => { const [q, ...a] = block.split("\n"); return { q: q.replace(/^Q:\s*/i, "").trim(), a: a.join("\n").replace(/^A:\s*/i, "").trim() }; }).filter((f) => f.q && f.a);
        else if (field === "images") next[field] = raw.split("\n").map((l) => l.split("|").map((s) => s.trim())).filter(([u]) => u).map(([url, alt = "", link = ""]) => ({ url, alt, link }));
        else next[field] = raw.split("\n").map((s) => s.trim()).filter(Boolean); // one item per line
      }
    }
    if (key === "story") next.isPlaceholder = false;
    await saveSetting(key, next as never);
    return "Content saved";
  });
}

export async function uploadHeroVideo(form: FormData) {
  await requireAdmin();
  await run("/admin/content?tab=hero", async () => {
    const f = form.get("file");
    if (!(f instanceof File) || !f.size) throw new Error("Choose a file");
    const up = await saveUpload(f, ["image", "video"]);
    await db.mediaAsset.create({ data: { url: up.url, filename: f.name, mimeType: up.mimeType, sizeBytes: up.sizeBytes } });
    const hero = await getSetting("hero");
    await saveSetting("hero", up.kind === "video" ? { ...hero, videoUrl: up.url } : { ...hero, posterImage: up.url });
    return up.kind === "video" ? "Hero video updated" : "Hero image updated";
  });
}

export async function savePress(form: FormData) {
  await requireAdmin();
  const id = optStr(form, "id");
  let savedId = id;
  await (async () => {
    try {
      const title = str(form, "title");
      if (!title) throw new Error("Title is required");
      const links = str(form, "links").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter(([, u]) => u?.startsWith("http")).map(([label, url]) => ({ label: label || url, url }));
      const data = {
        title,
        slug: slugify(str(form, "slug") || title),
        kind: str(form, "kind"),
        programName: optStr(form, "programName"),
        eventDate: optStr(form, "eventDate") ? new Date(`${str(form, "eventDate")}T12:00:00+08:00`) : null,
        description: str(form, "description"),
        body: optStr(form, "body"),
        coverImage: optStr(form, "coverImage"),
        videoUrl: optStr(form, "videoUrl"),
        links: JSON.stringify(links),
        isPublished: bool(form, "isPublished"),
        featureOnHome: bool(form, "featureOnHome"),
        sortOrder: int(form, "sortOrder"),
      };
      if (data.isPublished && /DRAFT|to be confirmed/i.test(`${data.description} ${data.programName ?? ""}`)) throw new Error("Replace the draft text with verified details before publishing");
      if (id) await db.pressEntry.update({ where: { id }, data });
      else savedId = (await db.pressEntry.create({ data })).id;
    } catch (e) {
      back(id ? `/admin/content/press/${id}` : "/admin/content/press/new", { error: e instanceof Error ? e.message : "Could not save" });
    }
  })();
  back(`/admin/content/press/${savedId}`, { ok: "Entry saved" });
}

export async function addPressImage(form: FormData) {
  await requireAdmin();
  const id = str(form, "pressEntryId");
  await run(`/admin/content/press/${id}`, async () => {
    const f = form.get("file");
    let url = str(form, "url");
    if (f instanceof File && f.size) {
      const up = await saveUpload(f, ["image"]);
      url = up.url;
      await db.mediaAsset.create({ data: { url, filename: f.name, mimeType: up.mimeType, sizeBytes: up.sizeBytes } });
    }
    if (!url) throw new Error("Upload an image or pick one from the library");
    const count = await db.pressImage.count({ where: { pressEntryId: id } });
    await db.pressImage.create({ data: { pressEntryId: id, url, caption: optStr(form, "caption"), sortOrder: count } });
    return "Image added";
  });
}

export async function removePressImage(form: FormData) {
  await requireAdmin();
  const id = str(form, "pressEntryId");
  await run(`/admin/content/press/${id}`, async () => {
    await db.pressImage.deleteMany({ where: { id: str(form, "imageId"), pressEntryId: id } });
    return "Image removed";
  });
}

export async function deletePress(form: FormData) {
  await requireAdmin({ ownerOnly: true });
  await db.pressEntry.delete({ where: { id: str(form, "id") } });
  back("/admin/content?tab=press", { ok: "Entry deleted" });
}

export async function saveJournal(form: FormData) {
  await requireAdmin();
  const id = optStr(form, "id");
  let savedId = id;
  await (async () => {
    try {
      const title = str(form, "title");
      if (!title) throw new Error("Title is required");
      const isPublished = bool(form, "isPublished");
      const existing = id ? await db.journalPost.findUnique({ where: { id } }) : null;
      const data = {
        title,
        slug: slugify(str(form, "slug") || title),
        excerpt: str(form, "excerpt"),
        body: str(form, "body"),
        coverImage: optStr(form, "coverImage"),
        isPublished,
        publishedAt: isPublished ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
      };
      if (id) await db.journalPost.update({ where: { id }, data });
      else savedId = (await db.journalPost.create({ data })).id;
    } catch (e) {
      back(id ? `/admin/content/journal/${id}` : "/admin/content/journal/new", { error: e instanceof Error ? e.message : "Could not save" });
    }
  })();
  back(`/admin/content/journal/${savedId}`, { ok: "Post saved" });
}

// ─── Media ─────────────────────────────────────────────────────────────────

export async function uploadMedia(form: FormData) {
  await requireAdmin();
  await run("/admin/media", async () => {
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new Error("Choose files to upload");
    for (const f of files) {
      try {
        const up = await saveUpload(f, ["image", "video"]);
        await db.mediaAsset.create({ data: { url: up.url, filename: f.name.slice(0, 200), mimeType: up.mimeType, sizeBytes: up.sizeBytes, alt: str(form, "alt") } });
      } catch (e) {
        throw new Error(`${f.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      }
    }
    return `${files.length} file(s) uploaded`;
  });
}

export async function updateMediaAlt(form: FormData) {
  await requireAdmin();
  await run("/admin/media", async () => {
    await db.mediaAsset.update({ where: { id: str(form, "id") }, data: { alt: str(form, "alt") } });
    return "Alt text saved";
  });
}

export async function deleteMedia(form: FormData) {
  await requireAdmin();
  await run("/admin/media", async () => {
    const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: str(form, "id") } });
    const inUse =
      (await db.productImage.count({ where: { url: asset.url } })) +
      (await db.pressImage.count({ where: { url: asset.url } })) +
      (await db.pressEntry.count({ where: { coverImage: asset.url } })) +
      (await db.siteSetting.count({ where: { value: { contains: asset.url } } }));
    if (inUse > 0) throw new Error("This file is still used on the site. Remove it from products, press or content first.");
    await db.mediaAsset.delete({ where: { id: asset.id } });
    await deleteUpload(asset.url);
    return "File deleted";
  });
}

// ─── Settings ──────────────────────────────────────────────────────────────

export async function saveShippingRule(form: FormData) {
  await requireAdmin({ ownerOnly: true });
  await run("/admin/settings", async () => {
    const id = optStr(form, "id");
    const fee = money(form, "fee");
    if (fee == null) throw new Error("Enter a shipping fee (0 for free)");
    const data = { name: str(form, "name") || "Shipping", region: optStr(form, "region"), fee, freeOverSubtotal: money(form, "freeOverSubtotal"), isActive: bool(form, "isActive") };
    if (id) await db.shippingRule.update({ where: { id }, data });
    else await db.shippingRule.create({ data });
    return "Shipping rule saved";
  });
}

export async function deleteShippingRule(form: FormData) {
  await requireAdmin({ ownerOnly: true });
  await run("/admin/settings", async () => {
    await db.shippingRule.delete({ where: { id: str(form, "id") } });
    return "Shipping rule deleted";
  });
}

export async function saveStaff(form: FormData) {
  const admin = await requireAdmin({ ownerOnly: true });
  await run("/admin/settings", async () => {
    const email = str(form, "email").toLowerCase();
    const role = str(form, "role") === "ADMIN" ? "ADMIN" : str(form, "role") === "STAFF" ? "STAFF" : "CUSTOMER";
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.id === admin.id && role !== "ADMIN") throw new Error("You cannot remove your own owner access");
      await db.user.update({ where: { id: existing.id }, data: { role } });
      return `${email} is now ${role.toLowerCase()}`;
    }
    const password = str(form, "password");
    const problem = passwordProblem(password);
    if (problem) throw new Error(`Password: ${problem}`);
    await db.user.create({ data: { email, name: str(form, "name") || email, role, passwordHash: await hashPassword(password) } });
    return `Account created for ${email}`;
  });
}

export async function markNotificationsRead() {
  await requireAdmin();
  await db.adminNotification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  back("/admin", { ok: "Notifications cleared" });
}

export async function processDeletion(form: FormData) {
  await requireAdmin({ ownerOnly: true });
  await run("/admin/customers", async () => {
    const id = str(form, "id");
    const u = await db.user.findUniqueOrThrow({ where: { id } });
    if (u.role !== "CUSTOMER") throw new Error("Staff accounts cannot be deleted here");
    // Orders are kept for accounting but detached; personal account data is removed.
    await db.order.updateMany({ where: { userId: id }, data: { userId: null } });
    await db.review.updateMany({ where: { userId: id }, data: { userId: null, displayName: "Former customer" } });
    await db.user.delete({ where: { id } });
    await db.newsletterSubscriber.updateMany({ where: { email: u.email }, data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() } });
    return `Account for ${u.email} deleted`;
  });
}

export async function markMessageHandled(form: FormData) {
  await requireAdmin();
  await run("/admin/customers?tab=messages", async () => {
    await db.contactMessage.update({ where: { id: str(form, "id") }, data: { handled: true } });
    return "Marked as handled";
  });
}
