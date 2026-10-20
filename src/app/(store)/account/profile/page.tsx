import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { requestDeletionAction, updateProfileAction } from "@/app/actions/account";
import { AccountShell } from "@/components/store/AccountNav";
import { ActionForm } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  return (
    <AccountShell title="Profile">
      <div className="max-w-lg space-y-16">
        <ActionForm action={updateProfileAction} submitLabel="Save Changes">
          <div><label className="label" htmlFor="p-name">Name</label><input id="p-name" name="name" defaultValue={user.name} required className="field" /></div>
          <div><label className="label">Email</label><p className="py-2 text-[15px]">{user.email}</p></div>
          <div><label className="label" htmlFor="p-phone">Mobile</label><input id="p-phone" name="phone" defaultValue={user.phone ?? ""} className="field" /></div>
          <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" name="marketing" defaultChecked={user.marketingConsent} className="accent-champagne" /> Email me news and offers</label>
          <fieldset className="space-y-4 border-t border-line pt-6">
            <legend className="eyebrow">Change password (optional)</legend>
            <div><label className="label" htmlFor="p-cur">Current password</label><input id="p-cur" name="currentPassword" type="password" autoComplete="current-password" className="field" /></div>
            <div><label className="label" htmlFor="p-new">New password</label><input id="p-new" name="newPassword" type="password" autoComplete="new-password" className="field" /></div>
          </fieldset>
        </ActionForm>

        <section className="border-t border-line pt-8">
          <h2 className="eyebrow mb-3">Delete account</h2>
          {user.deletionRequestedAt ? (
            <p className="text-[14px] text-muted">Deletion requested on {formatDate(user.deletionRequestedAt)}. We will process it within 30 days.</p>
          ) : (
            <form action={requestDeletionAction} className="space-y-3">
              <p className="text-[14px] text-muted">We will delete your account and personal data, keeping only the order records the law requires.</p>
              <button className="btn-outline">Request account deletion</button>
            </form>
          )}
        </section>
      </div>
    </AccountShell>
  );
}
