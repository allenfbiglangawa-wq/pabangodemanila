"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "../Icons";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/our-story", label: "Our Story" },
  { href: "/event-scenting", label: "Event Scenting" },
  { href: "/private-label", label: "Private Label" },
  { href: "/journal", label: "Journal" },
  { href: "/press", label: "Press & Events" },
  { href: "/contact", label: "Contact" },
];
// The client's design keeps the desktop bar to three links; the rest live in the footer and mobile menu.
const PRIMARY = [
  { href: "/shop", label: "Shop" },
  { href: "/our-story", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function HeaderClient({ cartCount, wishlistCount }: { cartCount: number; wishlistCount: number }) {
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className={`sticky top-0 z-40 bg-maroon text-pearl transition-all duration-500 ${compact ? "shadow-md" : ""}`}>
      <div className={`container-luxe flex items-center justify-between gap-3 sm:gap-6 transition-all duration-500 ${compact ? "h-14" : "h-16 lg:h-20"}`}>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <button className="-ml-2 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
            <MenuIcon />
          </button>
          <Link href="/" className="flex items-center" aria-label="Pabango de Manila, home">
            <Image src="/brand/v2/logo-wordmark-white.png" alt="Pabango de Manila, A Filipino Fragrance House" width={726} height={309} priority className={`w-auto transition-all duration-500 ${compact ? "h-9" : "h-10 lg:h-12"}`} />
          </Link>
        </div>

        <nav className="hidden min-w-0 flex-1 justify-end px-4 lg:flex" aria-label="Main">
          <ul className="flex items-center gap-8">
            {PRIMARY.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={`whitespace-nowrap text-[15px] transition-opacity hover:opacity-75 ${active ? "underline underline-offset-8" : ""}`}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="-mr-2 flex shrink-0 items-center sm:gap-2">
          <button className="p-2" aria-label="Search" onClick={() => setSearchOpen((s) => !s)}>
            <SearchIcon />
          </button>
          <Link href="/account" className="hidden p-2 sm:block" aria-label="Account">
            <UserIcon />
          </Link>
          <Link href="/account/wishlist" className="relative hidden p-2 sm:block" aria-label={`Wishlist, ${wishlistCount} items`}>
            <HeartIcon />
            {wishlistCount > 0 && <Dot n={wishlistCount} />}
          </Link>
          <Link href="/cart" className="relative p-2" aria-label={`Shopping bag, ${cartCount} items`}>
            <BagIcon />
            {cartCount > 0 && <Dot n={cartCount} />}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-pearl/20 bg-pearl text-charcoal">
          <form action="/shop" className="container-luxe flex items-center gap-4 py-5">
            <SearchIcon className="h-5 w-5 text-muted" />
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input id="site-search" name="q" autoFocus placeholder="Search fragrances, candles, gifts…" className="flex-1 bg-transparent font-serif text-2xl focus:outline-none" />
            <button className="btn-link">Search</button>
          </form>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-maroon text-pearl lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="container-luxe flex h-20 items-center justify-between">
            <Image src="/brand/v2/logo-wordmark-white.png" alt="Pabango de Manila" width={726} height={309} className="h-10 w-auto" />
            <button className="-mr-2 p-2" onClick={() => setOpen(false)} aria-label="Close menu">
              <CloseIcon />
            </button>
          </div>
          <nav className="container-luxe mt-6" aria-label="Mobile">
            <ul className="space-y-5">
              {NAV.map((n, i) => (
                <li key={n.href} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <Link href={n.href} className="display text-4xl">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-12 flex gap-6 border-t border-pearl/20 pt-6 text-[12px] uppercase tracking-[0.2em]">
              <Link href="/account">Account</Link>
              <Link href="/account/wishlist">Wishlist</Link>
              <Link href="/cart">Bag ({cartCount})</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Dot({ n }: { n: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pearl px-1 text-[10px] font-medium text-maroon">
      {n > 99 ? "99+" : n}
    </span>
  );
}
