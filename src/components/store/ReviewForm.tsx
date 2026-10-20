"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/app/actions/reviews";
import { StarIcon } from "../Icons";

export function ReviewForm({ productId, defaultName }: { productId: string; defaultName: string }) {
  const [state, action, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <p className="bg-ivory p-6 text-[14px]">{state.message}</p>;
  return (
    <form action={action} className="space-y-5 bg-ivory p-6 sm:p-8">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1 text-champagne">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n}>
              <StarIcon className="h-6 w-6" filled={n <= rating} />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="rv-title">Title (optional)</label>
        <input id="rv-title" name="title" maxLength={120} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="rv-body">Your review</label>
        <textarea id="rv-body" name="body" required minLength={10} maxLength={3000} rows={5} className="field" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="rv-name">Display name</label>
          <input id="rv-name" name="displayName" defaultValue={defaultName} maxLength={40} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="rv-video">Video link (optional)</label>
          <input id="rv-video" name="videoUrl" type="url" placeholder="https://youtube.com/…" className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="rv-photos">Photos (optional, up to 4)</label>
        <input id="rv-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="text-[13px]" />
      </div>
      <p className="text-[12px] text-muted">Reviews are checked before they appear. A “Verified Purchase” label is added automatically when you have a delivered order for this product.</p>
      {state && !state.ok && <p className="text-[13px] text-red-700">{state.message}</p>}
      <button className="btn-primary" disabled={pending || rating === 0}>{pending ? "Submitting…" : "Submit review"}</button>
    </form>
  );
}
