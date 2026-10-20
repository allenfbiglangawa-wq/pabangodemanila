"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function toggleWishlist(form: FormData) {
  const productId = String(form.get("productId") ?? "");
  const back = String(form.get("back") ?? "/");
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(back.startsWith("/") ? back : "/")}`);
  const existing = await db.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (existing) await db.wishlistItem.delete({ where: { id: existing.id } });
  else if (await db.product.findUnique({ where: { id: productId } })) await db.wishlistItem.create({ data: { userId: user.id, productId } });
  revalidatePath("/", "layout");
}
