import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { available } from "./inventory";
import { effectivePrice } from "./money";
import { MIN_REVIEWS_FOR_AGGREGATE } from "./constants";

export const cardInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" as const } },
  category: true,
} satisfies Prisma.ProductInclude;

type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  family: string | null;
  category: string | null;
  image: string | null;
  hoverImage: string | null;
  description: string;
  isPlaceholder: boolean;
  minPrice: number;
  compareAt: number | null;
  variants: { id: string; name: string; price: number; salePrice: number | null; available: number }[];
  rating: { average: number; count: number } | null;
  soldOut: boolean;
}

export async function ratingsFor(productIds: string[]) {
  if (!productIds.length) return new Map<string, { average: number; count: number }>();
  const rows = await db.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    rows
      .filter((r) => r._count._all >= MIN_REVIEWS_FOR_AGGREGATE)
      .map((r) => [r.productId, { average: r._avg.rating ?? 0, count: r._count._all }]),
  );
}

export async function toCards(products: CardProduct[]): Promise<ProductCardData[]> {
  const ratings = await ratingsFor(products.map((p) => p.id));
  return products.map((p) => {
    const prices = p.variants.map((v) => effectivePrice(v));
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const cheapest = p.variants.find((v) => effectivePrice(v) === minPrice);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      family: p.fragranceFamily,
      category: p.category?.name ?? null,
      image: p.images[0]?.url ?? null,
      hoverImage: p.images[1]?.url ?? null,
      description: p.description,
      isPlaceholder: p.isPlaceholder,
      minPrice,
      compareAt: cheapest && effectivePrice(cheapest) < cheapest.price ? cheapest.price : null,
      variants: p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, salePrice: v.salePrice, available: available(v) })),
      rating: ratings.get(p.id) ?? null,
      soldOut: p.variants.every((v) => available(v) <= 0),
    };
  });
}

export async function getCards(where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = { createdAt: "desc" }, take?: number) {
  const products = await db.product.findMany({ where: { status: "ACTIVE", ...where }, include: cardInclude, orderBy, take });
  return toCards(products);
}
