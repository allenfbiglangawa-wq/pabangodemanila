import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "@/app/actions/account";
import { ActionForm } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Create Account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-luxe max-w-md py-20">
      <h1 className="display text-center text-5xl">Create Account</h1>
      <div className="mt-12">
        <ActionForm action={registerAction} submitLabel="Create Account">
          <input type="hidden" name="next" value={next ?? ""} />
          <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required autoComplete="name" className="field" /></div>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="field" /></div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
            <p className="mt-1 text-[12px] text-muted">At least 10 characters, with letters and numbers.</p>
          </div>
          <label className="flex items-start gap-3 text-[13px] text-muted">
            <input type="checkbox" name="marketing" className="mt-0.5 accent-champagne" />
            <span>Send me news and offers by email (optional). I can unsubscribe at any time.</span>
          </label>
          <p className="text-[12px] text-muted">By creating an account you agree to our <Link href="/policies/terms" className="underline">Terms</Link> and <Link href="/policies/privacy" className="underline">Privacy Policy</Link>.</p>
        </ActionForm>
      </div>
      <p className="mt-10 text-center text-[14px] text-muted">Already have an account? <Link href="/account/login" className="text-charcoal underline">Sign in</Link></p>
    </div>
  );
}
