import { db } from "@/lib/db";
import { Flash, PageTitle } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <Flash sp={sp} />
      <PageTitle title="New product" sub="Save the product first, then add sizes, prices, stock and photos." />
      <ProductForm categories={categories} />
    </>
  );
}
