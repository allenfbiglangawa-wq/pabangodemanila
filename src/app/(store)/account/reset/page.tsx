import type { Metadata } from "next";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/account";
import { ActionForm } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Choose a New Password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="container-luxe max-w-md py-20">
      <h1 className="display text-center text-5xl">New Password</h1>
      <div className="mt-12">
        <ActionForm action={resetPasswordAction} submitLabel="Save Password" hideOnSuccess>
          <input type="hidden" name="token" value={token ?? ""} />
          <div><label className="label" htmlFor="password">New password</label><input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="field" /></div>
        </ActionForm>
        <p className="mt-8 text-center text-[13px]"><Link href="/account/login" className="underline">Back to sign in</Link></p>
      </div>
    </div>
  );
}
