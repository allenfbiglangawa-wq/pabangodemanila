import Image from "next/image";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { NewsletterForm } from "./NewsletterForm";
import { SocialLinks } from "./SocialLinks";

export async function SiteFooter() {
  const [contact, newsletter] = await Promise.all([getSetting("contact"), getSetting("newsletter")]);
  const cols = [
    {
      title: "Shop",
      links: [
        ["All Products", "/shop"],
        ["New Arrivals", "/shop?sort=new"],
        ["Bestsellers", "/shop?flag=bestseller"],
        ["Scented Candles", "/shop?category=scented-candles"],
      ],
    },
    {
      title: "The House",
      links: [
        ["About", "/our-story"],
        ["Event Scenting", "/event-scenting"],
        ["Private Label & B2B", "/private-label"],
        ["Press & Events", "/press"],
        ["Journal", "/journal"],
        ["Contact", "/contact"],
      ],
    },
    {
      title: "Customer Care",
      links: [
        ["FAQs", "/faqs"],
        ["Track an Order", "/track"],
        ["Shipping Policy", "/policies/shipping"],
        ["Returns & Refunds", "/policies/returns"],
        ["Privacy Policy", "/policies/privacy"],
        ["Terms & Conditions", "/policies/terms"],
      ],
    },
  ];
  return (
    <footer className="mt-32 bg-pearl">
      <div className="container-luxe grid gap-14 py-20 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-3">
          <Image src="/brand/v2/logo-lockup-maroon.png" alt="Pabango de Manila, A Filipino Fragrance House" width={726} height={864} className="h-28 w-auto" />
          {/* Copy from the client's revision (31 Oct 2026) */}
          <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-champagne-deep">Fragrance that Lives a Lifetime</p>
          <div className="mt-5 max-w-sm space-y-3 text-[14px] leading-relaxed text-muted">
            <p>Pabango de Manila is a Filipino fragrance house devoted to creating meaningful scent experiences for everyday living.</p>
            <p>Rooted in the art of fragrance and guided by thoughtful craftsmanship, we create scented candles, reed diffusers, room and linen sprays, diffuser oils, and lifestyle fragrances designed to transform spaces, evoke emotions, and make everyday moments more memorable.</p>
          </div>
          {(contact.email || contact.phone) && (
            <p className="mt-6 space-y-1 text-[14px] text-charcoal/80">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-champagne-deep">Get in touch</span>
              {contact.email && <a href={`mailto:${contact.email}`} className="block hover:text-champagne-deep">{contact.email}</a>}
              {contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="block hover:text-champagne-deep">{contact.phone}</a>}
            </p>
          )}
          <SocialLinks size="sm" className="mt-6 gap-3" />
        </div>
        {cols.map((c) => (
          <div key={c.title} className="lg:col-span-2">
            <p className="eyebrow mb-5">{c.title}</p>
            <ul className="space-y-3 text-[14px]">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-charcoal/80 hover:text-champagne-deep">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="lg:col-span-3">
          <p className="eyebrow mb-5">Newsletter</p>
          <NewsletterForm consentText={newsletter.consentText} source="footer" />
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-luxe flex items-center justify-between gap-4 py-6 text-[12px] text-muted">
          <p>© {new Date().getFullYear()} Pabango de Manila. All rights reserved. · Website by{" "}<a href="https://likhawebstudioph.com/" target="_blank" rel="noopener" className="underline hover:text-charcoal">Likha Web Studio</a></p>
          <Link href="/admin/login" className="hover:text-charcoal">Admin sign in</Link>
        </div>
      </div>
    </footer>
  );
}
