"use client";

import { useActionState } from "react";
import { submitInquiry } from "@/app/actions/inquiry";

export function InquiryForm({ eventTypes, defaultType, dateLabel = "Event date *" }: { eventTypes: string[]; defaultType?: string; dateLabel?: string }) {
  const [state, action, pending] = useActionState(submitInquiry, null);
  if (state?.ok) return <div className="bg-ivory p-10 text-center"><p className="font-serif text-3xl">Thank you.</p><p className="mt-4 text-[15px] text-muted">{state.message}</p></div>;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <div className="sm:col-span-2"><label className="label" htmlFor="i-name">Full name *</label><input id="i-name" name="fullName" required autoComplete="name" className="field" /></div>
      <div><label className="label" htmlFor="i-email">Email *</label><input id="i-email" name="email" type="email" required autoComplete="email" className="field" /></div>
      <div><label className="label" htmlFor="i-phone">Phone *</label><input id="i-phone" name="phone" type="tel" required autoComplete="tel" className="field" /></div>
      <div><label className="label" htmlFor="i-type">Inquiry type *</label><select id="i-type" name="eventType" required defaultValue={defaultType} className="field">{eventTypes.map((t) => <option key={t}>{t}</option>)}</select></div>
      <div><label className="label" htmlFor="i-date">{dateLabel}</label><input id="i-date" name="eventDate" type="date" min={today} required className="field" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="i-venue">Venue or location *</label><input id="i-venue" name="venue" required className="field" /></div>
      <div><label className="label" htmlFor="i-guests">Estimated guests</label><input id="i-guests" name="guestCount" type="number" min={1} className="field" /></div>
      <div><label className="label" htmlFor="i-size">Venue size (if known)</label><input id="i-size" name="venueSize" placeholder="e.g. ballroom, 400 sqm" className="field" /></div>
      <div><label className="label" htmlFor="i-style">Preferred fragrance style</label><input id="i-style" name="fragranceStyle" placeholder="Floral, fresh, woody…" className="field" /></div>
      <div>
        <label className="label" htmlFor="i-budget">Budget range</label>
        <select id="i-budget" name="budgetRange" className="field">
          <option value="">Prefer to discuss</option>
          <option>Under ₱25,000</option>
          <option>₱25,000 – ₱50,000</option>
          <option>₱50,000 – ₱100,000</option>
          <option>Above ₱100,000</option>
        </select>
      </div>
      <div className="sm:col-span-2"><label className="label" htmlFor="i-req">Additional requirements</label><textarea id="i-req" name="requirements" rows={4} className="field" /></div>
      <label className="flex items-start gap-3 text-[13px] text-muted sm:col-span-2">
        <input type="checkbox" name="consent" required className="mt-0.5 accent-champagne" />
        <span>I agree that Pabango de Manila may contact me about this inquiry. Submitting does not confirm a booking.</span>
      </label>
      {state && !state.ok && <p className="text-[13px] text-red-700 sm:col-span-2" role="alert">{state.message}</p>}
      <button className="btn-primary sm:col-span-2" disabled={pending}>{pending ? "Sending…" : "Send Inquiry"}</button>
    </form>
  );
}
