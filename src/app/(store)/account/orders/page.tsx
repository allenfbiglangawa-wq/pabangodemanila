import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AccountShell } from "@/components/store/AccountNav";
import { OrderTable } from "@/components/store/OrderTable";

export const metadata: Metadata = { title: "Order History", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return <AccountShell title="Order History"><OrderTable orders={orders} /></AccountShell>;
}
