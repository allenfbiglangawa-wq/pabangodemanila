import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, press, posts] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE", isPlaceholder: false }, select: { slug: true, updatedAt: true } }),
    db.pressEntry.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    db.journalPost.findMany({ where: { isPublished: true }, select: { slug: true, publishedAt: true } }),
  ]);
  const staticPaths = ["", "/shop", "/our-story", "/event-scenting", "/journal", "/press", "/contact", "/faqs"];
  return [
    ...staticPaths.map((p) => ({ url: siteUrl(p) })),
    ...products.map((p) => ({ url: siteUrl(`/products/${p.slug}`), lastModified: p.updatedAt })),
    ...press.map((p) => ({ url: siteUrl(`/press/${p.slug}`), lastModified: p.updatedAt })),
    ...posts.map((p) => ({ url: siteUrl(`/journal/${p.slug}`), lastModified: p.publishedAt ?? undefined })),
  ];
}
