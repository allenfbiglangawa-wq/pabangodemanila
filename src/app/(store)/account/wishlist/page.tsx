import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toCards, cardInclude } from "@/lib/catalog";
import { AccountShell } from "@/components/store/AccountNav";
import { ProductCard } from "@/components/store/ProductCard";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const items = await db.wishlistItem.findMany({ where: { userId: user.id, product: { status: "ACTIVE" } }, include: { product: { include: cardInclude } }, orderBy: { createdAt: "desc" } });
  const cards = await toCards(items.map((i) => i.product));
  return (
    <AccountShell title="Wishlist">
      {cards.length === 0 ? <p className="text-muted">Your wishlist is empty.</p> : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 xl:grid-cols-3">
          {cards.map((p) => <ProductCard key={p.id} p={p} wished />)}
        </div>
      )}
    </AccountShell>
  );
}
