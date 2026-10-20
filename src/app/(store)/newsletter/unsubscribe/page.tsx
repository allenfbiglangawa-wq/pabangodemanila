import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

async function unsubscribe(form: FormData) {
  "use server";
  const token = String(form.get("token") ?? "");
  await db.newsletterSubscriber.updateMany({ where: { unsubscribeToken: token }, data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() } });
  const { redirect } = await import("next/navigation");
  redirect(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}&done=1`);
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string; done?: string }> }) {
  const { token, done } = await searchParams;
  const sub = token ? await db.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } }) : null;
  return (
    <div className="container-luxe max-w-lg py-24 text-center">
      <h1 className="display text-5xl">Newsletter</h1>
      {!sub ? <p className="mt-6 text-muted">This link is not valid.</p> : done || sub.status === "UNSUBSCRIBED" ? (
        <p className="mt-6 text-muted">{sub.email} has been unsubscribed. You will not receive further marketing emails.</p>
      ) : (
        <form action={unsubscribe} className="mt-8 space-y-6">
          <input type="hidden" name="token" value={token} />
          <p className="text-muted">Unsubscribe {sub.email} from Pabango de Manila emails?</p>
          <button className="btn-primary">Unsubscribe</button>
        </form>
      )}
    </div>
  );
}
