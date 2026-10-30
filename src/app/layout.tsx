import type { Metadata, Viewport } from "next";
import { Gloock, Open_Sans } from "next/font/google";
import { getSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

// The client's mockup uses IDTF Identifier (headings) and Open Sauce / Gilroy (text). Until licensed
// web-font files are supplied, Gloock and Open Sans are the closest free (OFL) stand-ins.
const display = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
const body = Open_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-body", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSetting("seo");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: seo.title, template: `%s · ${seo.title}` },
    description: seo.description,
    openGraph: { type: "website", siteName: "Pabango de Manila", images: [seo.ogImage], locale: "en_PH" },
    twitter: { card: "summary_large_image" },
    verification: seo.googleSiteVerification ? { google: seo.googleSiteVerification } : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#781d16" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
