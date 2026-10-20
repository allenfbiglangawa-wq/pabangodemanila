import { getCartSummary } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { AnnouncementBar } from "./AnnouncementBar";
import { HeaderClient } from "./HeaderClient";

export async function SiteHeader() {
  const [cart, user, announcement] = await Promise.all([getCartSummary(), getCurrentUser(), getSetting("announcement")]);
  const wishlistCount = user ? await db.wishlistItem.count({ where: { userId: user.id } }) : 0;
  return (
    <>
      {announcement.enabled && <AnnouncementBar messages={announcement.messages.filter(Boolean)} />}
      <HeaderClient cartCount={cart.itemCount} wishlistCount={wishlistCount} />
    </>
  );
}
