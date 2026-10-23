import Link from "next/link";
import { logoutAction } from "@/app/actions/account";
import { getCurrentUser, isStaff } from "@/lib/auth";

const LINKS = [
  ["/account", "Overview"],
  ["/account/orders", "Orders"],
  ["/account/wishlist", "Wishlist"],
  ["/account/addresses", "Addresses"],
  ["/account/profile", "Profile"],
];

export async function AccountShell({ title, children }: { title: string; children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="container-luxe pt-14">
      <h1 className="display text-5xl lg:text-6xl">{title}</h1>
      <div className="mt-12 grid gap-12 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Account">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-[12px] uppercase tracking-[0.18em] lg:flex-col">
            {LINKS.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-champagne-deep">{label}</Link></li>)}
            {isStaff(user?.role) && <li><Link href="/admin" className="text-champagne-deep hover:text-charcoal">Admin dashboard</Link></li>}
            <li><form action={logoutAction}><button className="uppercase tracking-[0.18em] text-muted hover:text-charcoal">Sign out</button></form></li>
          </ul>
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
