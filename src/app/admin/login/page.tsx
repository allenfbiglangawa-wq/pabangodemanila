import { loginAction } from "@/app/actions/account";
import { ActionForm } from "@/components/ActionForm";

export const metadata = { title: "Admin Sign In", robots: { index: false } };

export default function AdminLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-5">
      <div className="w-full max-w-sm bg-pearl p-10">
        <p className="text-center font-serif text-xl tracking-[0.28em]">PABANGO DE MANILA</p>
        <p className="mt-1 text-center text-[11px] uppercase tracking-[0.2em] text-muted">Business Dashboard</p>
        <div className="mt-10">
          <ActionForm action={loginAction} submitLabel="Sign In">
            <input type="hidden" name="admin" value="1" />
            <input type="hidden" name="next" value="/admin" />
            <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" autoComplete="username" /></div>
            <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required className="field" autoComplete="current-password" /></div>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
