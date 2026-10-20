import type { Category, Product } from "@prisma/client";
import { saveProduct } from "@/app/admin/actions";
import { Check, Field, TextArea } from "./ui";

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  return (
    <form action={saveProduct} className="admin-card grid gap-4 md:grid-cols-2">
      {product && <input type="hidden" name="id" value={product.id} />}
      <Field label="Product name" name="name" defaultValue={product?.name} required />
      <Field label="URL slug" name="slug" defaultValue={product?.slug} hint="Leave blank to generate from the name." />
      <TextArea label="Description" name="description" defaultValue={product?.description} rows={5} className="md:col-span-2" />
      <div>
        <label className="admin-label" htmlFor="f-cat">Category</label>
        <select id="f-cat" name="categoryId" defaultValue={product?.categoryId ?? ""} className="admin-input">
          <option value="">— None —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <Field label="Fragrance family" name="fragranceFamily" defaultValue={product?.fragranceFamily} placeholder="Floral, Woody, Fresh…" />
      <Field label="Top notes (comma separated)" name="topNotes" defaultValue={product?.topNotes} />
      <Field label="Heart notes" name="heartNotes" defaultValue={product?.heartNotes} />
      <Field label="Base notes" name="baseNotes" defaultValue={product?.baseNotes} />
      <Field label="Product video URL (optional)" name="videoUrl" defaultValue={product?.videoUrl} hint="An MP4 from the Media Library." />
      <TextArea label="Shipping & returns note (optional)" name="shippingInfo" defaultValue={product?.shippingInfo} rows={2} className="md:col-span-2" />
      <Field label="SEO title" name="seoTitle" defaultValue={product?.seoTitle} />
      <Field label="SEO description" name="seoDescription" defaultValue={product?.seoDescription} />
      <div>
        <label className="admin-label" htmlFor="f-status">Status</label>
        <select id="f-status" name="status" defaultValue={product?.status ?? "DRAFT"} className="admin-input">
          <option value="DRAFT">Draft (hidden)</option>
          <option value="ACTIVE">Active (visible in shop)</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <div className="flex flex-wrap items-end gap-5">
        <Check label="Featured" name="isFeatured" defaultChecked={product?.isFeatured} />
        <Check label="Bestseller" name="isBestseller" defaultChecked={product?.isBestseller} />
        <Check label="New arrival" name="isNewArrival" defaultChecked={product?.isNewArrival} />
        <Check label="Sample / placeholder" name="isPlaceholder" defaultChecked={product?.isPlaceholder} />
      </div>
      <div className="md:col-span-2"><button className="admin-btn">Save product</button></div>
    </form>
  );
}
