import type { Metadata } from "next";
import { forgotPasswordAction } from "@/app/actions/account";
import { ActionForm } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Reset Password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <div className="container-luxe max-w-md py-20">
      <h1 className="display text-center text-5xl">Reset Password</h1>
      <p className="mt-4 text-center text-muted">We’ll email you a link to choose a new password.</p>
      <div className="mt-12">
        <ActionForm action={forgotPasswordAction} submitLabel="Send Reset Link" hideOnSuccess>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" /></div>
        </ActionForm>
      </div>
    </div>
  );
}
