import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { available } from "@/lib/inventory";
import { centavosToPesosInput } from "@/lib/money";
import { addProductImageFromLibrary, makePrimaryImage, removeProductImage, saveVariant, uploadProductImage } from "../../../actions";
import { Check, Field, Flash, PageTitle } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, categories, library] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { variants: { orderBy: { sortOrder: "asc" } }, images: { orderBy: { sortOrder: "asc" } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.mediaAsset.findMany({ where: { mimeType: { startsWith: "image/" } }, orderBy: { createdAt: "desc" }, take: 60 }),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <Flash sp={sp} />
      <PageTitle title={product.name} sub={product.status === "ACTIVE" ? <Link href={`/products/${product.slug}`} className="underline" target="_blank">View in store ↗</Link> : "Not visible in the store"} actions={<Link href="/admin/products" className="admin-btn-ghost">All products</Link>} />
      <ProductForm product={product} categories={categories} />

      <section className="admin-card">
        <h2 className="mb-4 text-[13px] font-medium">Sizes, prices & stock</h2>
        <p className="mb-4 text-[12px] text-muted">Prices in pesos. Unit cost is private and used for profit reports. Stock is changed from Inventory so every change is logged.</p>
        <div className="space-y-3">
          {[...product.variants, null].map((v) => (
            <form key={v?.id ?? "new"} action={saveVariant} className="grid items-end gap-3 border-b border-line pb-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_90px_auto_auto]">
              <input type="hidden" name="productId" value={product.id} />
              {v && <input type="hidden" name="id" value={v.id} />}
              <Field label={v ? "Size / variant" : "New variant"} name="name" defaultValue={v?.name} placeholder="50 ml" required />
              <Field label="SKU" name="sku" defaultValue={v?.sku} required />
              <Field label="Price (₱)" name="price" defaultValue={centavosToPesosInput(v?.price)} required inputMode="decimal" />
              <Field label="Sale price (₱)" name="salePrice" defaultValue={centavosToPesosInput(v?.salePrice)} inputMode="decimal" />
              <Field label="Unit cost (₱)" name="cost" defaultValue={centavosToPesosInput(v?.cost)} inputMode="decimal" />
              <Field label="Low-stock at" name="lowStockThreshold" type="number" defaultValue={v?.lowStockThreshold ?? 5} />
              {v ? (
                <div className="text-[12px]"><p className="text-muted">On hand {v.stockOnHand} · held {v.stockReserved}</p><p>Available <strong>{available(v)}</strong> · <Link href={`/admin/inventory?q=${v.sku}`} className="underline">adjust</Link></p></div>
              ) : (
                <Field label="Opening stock" name="openingStock" type="number" defaultValue={0} />
              )}
              <div className="flex items-center gap-3">
                <Check label="Active" name="isActive" defaultChecked={v?.isActive ?? true} />
                <button className="admin-btn">{v ? "Save" : "Add"}</button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2 className="mb-4 text-[13px] font-medium">Photos</h2>
        <div className="flex flex-wrap gap-4">
          {product.images.map((img, i) => (
            <div key={img.id} className="w-32 text-[11px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} className="aspect-[4/5] w-full bg-ivory object-cover" />
              <div className="mt-1 flex justify-between">
                {i === 0 ? <span className="text-muted">Primary</span> : (
                  <form action={makePrimaryImage}><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="imageId" value={img.id} /><button className="underline">Make primary</button></form>
                )}
                <form action={removeProductImage}><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="imageId" value={img.id} /><button className="text-red-700 underline">Remove</button></form>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <form action={uploadProductImage} className="space-y-3">
            <input type="hidden" name="productId" value={product.id} />
            <label className="admin-label" htmlFor="imgs">Upload photos (JPG, PNG, WebP · max 8 MB each)</label>
            <input id="imgs" type="file" name="images" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="text-[13px]" />
            <Field label="Alt text (describe the photo)" name="alt" defaultValue={product.name} />
            <button className="admin-btn">Upload</button>
          </form>
          {library.length > 0 && (
            <form action={addProductImageFromLibrary} className="space-y-3">
              <input type="hidden" name="productId" value={product.id} />
              <label className="admin-label" htmlFor="lib">Or pick from the Media Library</label>
              <select id="lib" name="url" className="admin-input">{library.map((m) => <option key={m.id} value={m.url}>{m.filename}</option>)}</select>
              <Field label="Alt text" name="alt" defaultValue={product.name} />
              <button className="admin-btn-ghost">Add image</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
