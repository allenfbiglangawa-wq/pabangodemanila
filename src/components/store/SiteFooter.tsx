import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { NewsletterForm } from "./NewsletterForm";

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
    <footer className="mt-32 border-t border-line bg-ivory">
      <div className="container-luxe grid gap-14 py-20 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-3">
          <p className="font-serif text-2xl tracking-[0.3em]">PABANGO DE MANILA</p>
          {contact.tagline && <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-champagne-deep">{contact.tagline}</p>}
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-muted">{contact.footerAbout}</p>
          {(contact.email || contact.phone) && (
            <p className="mt-5 space-y-1 text-[14px] text-charcoal/80">
              {contact.email && <a href={`mailto:${contact.email}`} className="block hover:text-champagne-deep">{contact.email}</a>}
              {contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="block hover:text-champagne-deep">{contact.phone}</a>}
            </p>
          )}
          <div className="mt-6 flex gap-5 text-[12px] uppercase tracking-[0.2em]">
            {contact.instagramUrl && <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-champagne-deep">Instagram</a>}
            {contact.facebookUrl && <a href={contact.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-champagne-deep">Facebook</a>}
            {contact.messengerUrl && <a href={contact.messengerUrl} target="_blank" rel="noopener noreferrer" className="hover:text-champagne-deep">Messenger</a>}
          </div>
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
          <p>© {new Date().getFullYear()} Pabango de Manila. All rights reserved.</p>
          <Link href="/admin/login" className="hover:text-charcoal">Admin sign in</Link>
        </div>
      </div>
    </footer>
  );
}
