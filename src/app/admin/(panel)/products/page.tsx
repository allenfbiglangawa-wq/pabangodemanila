import Link from "next/link";
import { db } from "@/lib/db";
import { available } from "@/lib/inventory";
import { effectivePrice, formatPHP } from "@/lib/money";
import { saveCategory } from "../../actions";
import { Check, Field, Flash, PageTitle } from "@/components/admin/ui";

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const tabs = (
    <div className="mb-6 flex gap-4 border-b border-line text-[13px]">
      <Link href="/admin/products" className={`pb-2 ${sp.tab !== "categories" ? "border-b-2 border-charcoal" : "text-muted"}`}>Products</Link>
      <Link href="/admin/products?tab=categories" className={`pb-2 ${sp.tab === "categories" ? "border-b-2 border-charcoal" : "text-muted"}`}>Categories</Link>
    </div>
  );

  if (sp.tab === "categories") {
    const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
    return (
      <>
        <Flash sp={sp} />
        <PageTitle title="Categories" sub="Collections shown on the homepage and in the shop. Confirm these with the owner before launch." />
        {tabs}
        <div className="space-y-4">
          {[...cats, null].map((c) => (
            <form key={c?.id ?? "new"} action={saveCategory} className="admin-card grid items-end gap-3 md:grid-cols-[1fr_1fr_2fr_1.5fr_80px_auto_auto]">
              {c && <input type="hidden" name="id" value={c.id} />}
              <Field label={c ? `Name (${c._count.products} products)` : "New category name"} name="name" defaultValue={c?.name} required />
              <Field label="URL slug" name="slug" defaultValue={c?.slug} />
              <Field label="Description" name="description" defaultValue={c?.description} />
              <Field label="Image URL (from Media Library)" name="imageUrl" defaultValue={c?.imageUrl} />
              <Field label="Order" name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} />
              <Check label="Active" name="isActive" defaultChecked={c?.isActive ?? true} />
              <button className="admin-btn">{c ? "Save" : "Add"}</button>
            </form>
          ))}
        </div>
      </>
    );
  }

  const products = await db.product.findMany({
    where: sp.q ? { OR: [{ name: { contains: sp.q } }, { variants: { some: { sku: { contains: sp.q.toUpperCase() } } } }] } : {},
    include: { variants: true, category: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <>
      <Flash sp={sp} />
      <PageTitle title="Products" sub={`${products.length} product(s)`} actions={<Link href="/admin/products/new" className="admin-btn">Add product</Link>} />
      {tabs}
      <form className="mb-5 flex max-w-md gap-2"><input name="q" defaultValue={sp.q} placeholder="Search name or SKU" className="admin-input" /><button className="admin-btn">Search</button></form>
      <div className="admin-card overflow-x-auto p-0">
        <table className="admin-table">
          <thead><tr><th></th><th>Product</th><th>Category</th><th>Status</th><th>Variants</th><th className="text-right">Price</th><th className="text-right">Available</th></tr></thead>
          <tbody>
            {products.map((p) => {
              const prices = p.variants.map(effectivePrice);
              return (
                <tr key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <td className="w-14"><img src={p.images[0]?.url ?? "/placeholders/bottle-1.svg"} alt="" className="h-14 w-11 bg-ivory object-cover" /></td>
                  <td><Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>{p.isPlaceholder && <span className="badge ml-2 bg-amber-50 text-amber-800">Sample</span>}<span className="block text-[11px] text-muted">{[p.isFeatured && "Featured", p.isBestseller && "Bestseller", p.isNewArrival && "New"].filter(Boolean).join(" · ")}</span></td>
                  <td>{p.category?.name ?? "—"}</td>
                  <td><span className={`badge ${p.status === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : "bg-stone-100"}`}>{p.status.toLowerCase()}</span></td>
                  <td>{p.variants.length}</td>
                  <td className="text-right">{prices.length ? formatPHP(Math.min(...prices)) : "—"}</td>
                  <td className="text-right">{p.variants.reduce((s, v) => s + available(v), 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
