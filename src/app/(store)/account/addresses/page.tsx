import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PH_REGIONS } from "@/lib/constants";
import { deleteAddressAction, saveAddressAction } from "@/app/actions/account";
import { AccountShell } from "@/components/store/AccountNav";
import { ActionForm } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } });
  const f = (name: string, label: string, extra: Record<string, unknown> = {}) => (
    <div><label className="label" htmlFor={`a-${name}`}>{label}</label><input id={`a-${name}`} name={name} className="field" {...extra} /></div>
  );
  return (
    <AccountShell title="Addresses">
      <div className="grid gap-12 xl:grid-cols-2">
        <ul className="space-y-4">
          {addresses.length === 0 && <li className="text-muted">No saved addresses.</li>}
          {addresses.map((a) => (
            <li key={a.id} className="border border-line p-5 text-[14px] leading-relaxed">
              {a.isDefault && <p className="eyebrow mb-2">Default</p>}
              <p>{a.fullName} · {a.phone}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />Brgy. {a.barangay}, {a.city}, {a.province} {a.postalCode}<br />{a.region}</p>
              <form action={deleteAddressAction} className="mt-3"><input type="hidden" name="id" value={a.id} /><button className="text-[12px] underline">Delete</button></form>
            </li>
          ))}
        </ul>
        <div>
          <h2 className="eyebrow mb-6">Add an address</h2>
          <ActionForm action={saveAddressAction} submitLabel="Save Address" className="grid gap-4 sm:grid-cols-2" buttonClassName="btn-primary sm:col-span-2">
            {f("fullName", "Full name", { required: true, defaultValue: user.name })}
            {f("phone", "Mobile", { required: true, defaultValue: user.phone ?? "" })}
            <div className="sm:col-span-2">{f("line1", "House no., street", { required: true })}</div>
            <div className="sm:col-span-2">{f("line2", "Unit / landmark")}</div>
            <div className="sm:col-span-2"><label className="label" htmlFor="a-region">Region</label><select id="a-region" name="region" required className="field">{PH_REGIONS.map((r) => <option key={r}>{r}</option>)}</select></div>
            {f("province", "Province", { required: true })}
            {f("city", "City / Municipality", { required: true })}
            {f("barangay", "Barangay", { required: true })}
            {f("postalCode", "Postal code", { required: true, maxLength: 4 })}
            <label className="flex items-center gap-3 text-[14px] sm:col-span-2"><input type="checkbox" name="isDefault" className="accent-champagne" /> Make default</label>
          </ActionForm>
        </div>
      </div>
    </AccountShell>
  );
}
