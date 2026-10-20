import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCards } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { pesosToCentavos } from "@/lib/money";
import { ProductCard } from "@/components/store/ProductCard";

export const metadata: Metadata = { title: "Shop", description: "Shop fragrances, candles, diffusers and gift collections." };
export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const where: Prisma.ProductWhereInput = {};
  const and: Prisma.ProductWhereInput[] = [];
  if (sp.category) and.push({ category: { slug: sp.category } });
  if (sp.family) and.push({ fragranceFamily: sp.family });
  if (q) and.push({ OR: [{ name: { contains: q } }, { description: { contains: q } }, { fragranceFamily: { contains: q } }, { topNotes: { contains: q } }, { heartNotes: { contains: q } }, { baseNotes: { contains: q } }] });
  if (sp.flag === "featured") and.push({ isFeatured: true });
  if (sp.flag === "bestseller") and.push({ isBestseller: true });
  if (sp.flag === "new") and.push({ isNewArrival: true });
  if (and.length) where.AND = and;

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sp.sort === "name" ? { name: "asc" } : sp.sort === "new" ? { createdAt: "desc" } : { isFeatured: "desc" };

  const [categories, familiesRaw, user] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ where: { status: "ACTIVE", fragranceFamily: { not: null } }, select: { fragranceFamily: true }, distinct: ["fragranceFamily"] }),
    getCurrentUser(),
  ]);
  let cards = await getCards(where, orderBy);

  // Price and availability filters work on computed variant prices / stock.
  const min = pesosToCentavos(sp.min);
  const max = pesosToCentavos(sp.max);
  if (min != null) cards = cards.filter((c) => c.minPrice >= min);
  if (max != null) cards = cards.filter((c) => c.minPrice <= max);
  if (sp.stock === "in") cards = cards.filter((c) => !c.soldOut);
  if (sp.sort === "price-asc") cards.sort((a, b) => a.minPrice - b.minPrice);
  if (sp.sort === "price-desc") cards.sort((a, b) => b.minPrice - a.minPrice);

  const wished = new Set(user ? (await db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } })).map((w) => w.productId) : []);
  const activeCategory = categories.find((c) => c.slug === sp.category);
  const families = familiesRaw.map((f) => f.fragranceFamily!).sort();

  const link = (patch: SP) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <div className="container-luxe pt-14 lg:pt-20">
      <header className="text-center">
        <p className="eyebrow mb-4">{q ? "Search" : "The Collection"}</p>
        <h1 className="display text-5xl lg:text-7xl">{q ? `“${q}”` : activeCategory?.name ?? "Shop All"}</h1>
        {activeCategory?.description && !activeCategory.description.startsWith("PLACEHOLDER") && (
          <p className="mx-auto mt-5 max-w-xl text-muted">{activeCategory.description}</p>
        )}
      </header>

      <nav className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3 border-y border-line py-5 text-[12px] uppercase tracking-[0.18em]" aria-label="Categories">
        <Link href={link({ category: undefined })} className={!sp.category ? "text-champagne-deep" : "hover:text-champagne-deep"}>All</Link>
        {categories.map((c) => (
          <Link key={c.id} href={link({ category: c.slug })} className={sp.category === c.slug ? "text-champagne-deep" : "hover:text-champagne-deep"}>
            {c.name}
          </Link>
        ))}
      </nav>

      <div className="mt-10 grid gap-12 lg:grid-cols-[220px_1fr]">
        <aside>
          <form className="space-y-8 text-[14px]" aria-label="Filters">
            {sp.category && <input type="hidden" name="category" value={sp.category} />}
            <div>
              <label className="label" htmlFor="q">Search</label>
              <input id="q" name="q" defaultValue={q} className="field" placeholder="Name or note" />
            </div>
            <div>
              <label className="label" htmlFor="sort">Sort by</label>
              <select id="sort" name="sort" defaultValue={sp.sort ?? ""} className="field">
                <option value="">Featured</option>
                <option value="new">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </div>
            {families.length > 0 && (
              <div>
                <label className="label" htmlFor="family">Fragrance family</label>
                <select id="family" name="family" defaultValue={sp.family ?? ""} className="field">
                  <option value="">All families</option>
                  {families.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label" htmlFor="flag">Highlights</label>
              <select id="flag" name="flag" defaultValue={sp.flag ?? ""} className="field">
                <option value="">Everything</option>
                <option value="new">New arrivals</option>
                <option value="bestseller">Bestsellers</option>
                <option value="featured">Featured</option>
              </select>
            </div>
            <fieldset>
              <legend className="label">Price (₱)</legend>
              <div className="flex gap-2">
                <input name="min" defaultValue={sp.min} placeholder="Min" inputMode="decimal" className="field" aria-label="Minimum price" />
                <input name="max" defaultValue={sp.max} placeholder="Max" inputMode="decimal" className="field" aria-label="Maximum price" />
              </div>
            </fieldset>
            <label className="flex items-center gap-3">
              <input type="checkbox" name="stock" value="in" defaultChecked={sp.stock === "in"} className="accent-champagne" /> In stock only
            </label>
            <div className="flex gap-3">
              <button className="btn-primary flex-1 !px-4">Apply</button>
              <Link href="/shop" className="btn-outline !px-4">Clear</Link>
            </div>
          </form>
        </aside>

        <section aria-live="polite">
          <p className="mb-8 text-[13px] text-muted">{cards.length} {cards.length === 1 ? "piece" : "pieces"}</p>
          {cards.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-serif text-3xl">Nothing matches just yet.</p>
              <Link href="/shop" className="btn-link mt-6">View all</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-x-6 xl:grid-cols-3">
              {cards.map((p) => <ProductCard key={p.id} p={p} wished={wished.has(p.id)} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
