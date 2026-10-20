"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { saveUpload, UploadError } from "@/lib/storage";
import { REVIEW_ELIGIBLE_STATUSES } from "@/lib/constants";
import { notifyAdmin } from "@/lib/notifications";
import type { ActionState } from "./cart";

export async function submitReview(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in to write a review." };
  if (!(await rateLimit("review", 5, 3600_000))) return { ok: false, message: "Too many reviews submitted. Please try again later." };
  if (form.get("website")) return { ok: true, message: "Thank you." };

  const productId = String(form.get("productId") ?? "");
  const rating = parseInt(String(form.get("rating") ?? ""), 10);
  const body = String(form.get("body") ?? "").trim();
  const title = String(form.get("title") ?? "").trim() || null;
  const displayName = String(form.get("displayName") ?? "").trim() || user.name.split(" ")[0];
  const videoUrl = String(form.get("videoUrl") ?? "").trim();
  if (!(rating >= 1 && rating <= 5)) return { ok: false, message: "Please choose a rating from 1 to 5 stars." };
  if (body.length < 10 || body.length > 3000) return { ok: false, message: "Please write between 10 and 3,000 characters." };
  if (videoUrl && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|facebook\.com|instagram\.com)\//.test(videoUrl))
    return { ok: false, message: "Video links must be from YouTube, Vimeo, Facebook or Instagram." };
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return { ok: false, message: "Product not found." };

  const already = await db.review.findFirst({ where: { productId, userId: user.id } });
  if (already) return { ok: false, message: "You have already reviewed this product." };

  // Verified purchase: a delivered/completed order line for this product that has not been reviewed.
  const eligibleItem = await db.orderItem.findFirst({
    where: { productId, reviews: { none: {} }, order: { userId: user.id, status: { in: REVIEW_ELIGIBLE_STATUSES } } },
  });

  const media: { url: string; type: string }[] = [];
  try {
    for (const f of form.getAll("photos").slice(0, 4)) {
      if (f instanceof File && f.size > 0) media.push({ url: (await saveUpload(f, ["image"])).url, type: "IMAGE" });
    }
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: e.message };
    throw e;
  }
  if (videoUrl) media.push({ url: videoUrl, type: "VIDEO" });

  await db.review.create({
    data: {
      productId,
      userId: user.id,
      orderItemId: eligibleItem?.id ?? null,
      isVerifiedPurchase: Boolean(eligibleItem),
      rating,
      title,
      body,
      displayName: displayName.slice(0, 40),
      media: { create: media },
    },
  });
  await notifyAdmin(db, "REVIEW", `New review awaiting moderation for ${product.name}`, "/admin/reviews");
  return { ok: true, message: "Thank you. Your review will appear once it has been checked by our team." };
}

export async function reportReview(form: FormData) {
  if (!(await rateLimit("report", 10, 3600_000))) return;
  const reviewId = String(form.get("reviewId") ?? "");
  const reason = String(form.get("reason") ?? "Inappropriate").slice(0, 300);
  const review = await db.review.findUnique({ where: { id: reviewId }, include: { product: true } });
  if (!review) return;
  await db.reviewReport.create({ data: { reviewId, reason } });
  await notifyAdmin(db, "REVIEW_REPORTED", `A review on ${review.product.name} was reported: ${reason}`, "/admin/reviews?filter=reported");
  revalidatePath(`/products/${review.product.slug}`);
}
