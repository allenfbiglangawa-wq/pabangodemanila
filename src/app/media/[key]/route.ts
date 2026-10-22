import { db } from "@/lib/db";

/** Serves uploads kept in the database (UPLOAD_STORAGE=database). Names are unique, so cache forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const file = await db.storedFile.findUnique({ where: { key } });
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: { "Content-Type": file.mimeType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
