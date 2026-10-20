import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/actions/account";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const [pending, review, inquiries, reviews, unread] = await Promise.all([
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    db.order.count({ where: { status: "PAYMENT_UNDER_REVIEW" } }),
    db.eventInquiry.count({ where: { status: "INQUIRY_RECEIVED" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.adminNotification.count({ where: { readAt: null } }),
  ]);
  return (
    <div className="min-h-screen bg-[#faf9f6] lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="no-print border-b border-line bg-pearl lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="px-6 pb-4 pt-6">
          <Link href="/admin" className="font-serif text-[17px] tracking-[0.24em]">PABANGO DE MANILA</Link>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted">Business Dashboard</p>
        </div>
        <AdminNav badges={{ "/admin/orders": pending + review, "/admin/events": inquiries, "/admin/reviews": reviews, "/admin": unread }} />
        <div className="border-t border-line px-6 py-4 text-[12px] text-muted">
          <p className="truncate">{user.email}</p>
          <div className="mt-2 flex gap-4">
            <Link href="/" className="underline">View store</Link>
            <form action={logoutAction}><button className="underline">Sign out</button></form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 lg:px-10">{children}</main>
    </div>
  );
}
