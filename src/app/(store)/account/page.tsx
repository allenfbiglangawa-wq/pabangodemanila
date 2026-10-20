import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AccountShell } from "@/components/store/AccountNav";
import { OrderTable } from "@/components/store/OrderTable";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 });
  return (
    <AccountShell title={`Hello, ${user.name.split(" ")[0]}`}>
      <h2 className="eyebrow mb-6">Recent orders</h2>
      <OrderTable orders={orders} />
      {orders.length > 0 && <Link href="/account/orders" className="btn-link mt-8">All orders</Link>}
    </AccountShell>
  );
}
