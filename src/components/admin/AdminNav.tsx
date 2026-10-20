"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/orders", "Orders"],
  ["/admin/products", "Products"],
  ["/admin/inventory", "Inventory"],
  ["/admin/customers", "Customers"],
  ["/admin/analytics", "Sales Analytics"],
  ["/admin/events", "Event Bookings"],
  ["/admin/reviews", "Reviews"],
  ["/admin/promotions", "Promotions"],
  ["/admin/content", "Website Content"],
  ["/admin/media", "Media Library"],
  ["/admin/settings", "Settings"],
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="admin-btn-ghost m-4 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>Menu</button>
      <nav className={`${open ? "block" : "hidden"} lg:block`} aria-label="Admin">
        <ul className="space-y-0.5 px-3 pb-6">
          {NAV.map(([href, label]) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} onClick={() => setOpen(false)} className={`flex items-center justify-between rounded-sm px-3 py-2 text-[13px] transition-colors ${active ? "bg-charcoal text-pearl" : "hover:bg-ivory"}`}>
                  {label}
                  {badges[href] ? <span className={`badge ${active ? "bg-pearl/20" : "bg-champagne/25 text-charcoal"}`}>{badges[href]}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
