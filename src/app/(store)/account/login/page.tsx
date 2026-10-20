import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/actions/account";
import { ActionForm } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Sign In", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-luxe max-w-md py-20">
      <h1 className="display text-center text-5xl">Sign In</h1>
      <div className="mt-12">
        <ActionForm action={loginAction} submitLabel="Sign In">
          <input type="hidden" name="next" value={next ?? ""} />
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="field" /></div>
          <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className="field" /></div>
          <p className="text-right text-[13px]"><Link href="/account/forgot" className="underline">Forgot password?</Link></p>
        </ActionForm>
      </div>
      <p className="mt-10 text-center text-[14px] text-muted">
        New to Pabango de Manila? <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-charcoal underline">Create an account</Link>
      </p>
    </div>
  );
}
