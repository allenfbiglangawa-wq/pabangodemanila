"use client";

import { useEffect } from "react";

// Shown instead of a blank "Application error" screen. A page loaded just before a new deploy can ask for
// script files that no longer exist; one automatic reload fixes that. The message helps us find other causes.
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const stale = /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Loading CSS chunk/i.test(error.message);
    try {
      if (stale && !sessionStorage.getItem("pdm-reloaded")) {
        sessionStorage.setItem("pdm-reloaded", "1");
        window.location.reload();
      }
    } catch {}
    console.error(error);
  }, [error]);
  return (
    <div className="container-luxe py-32 text-center">
      <h1 className="display text-4xl">Something went wrong</h1>
      <p className="mt-4 text-muted">Please reload the page. If it keeps happening, send us a screenshot of this message.</p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={() => window.location.reload()} className="btn-primary">Reload page</button>
        <button onClick={reset} className="btn-outline">Try again</button>
      </div>
      <p className="mx-auto mt-10 max-w-xl break-words text-[12px] text-muted">{error.digest ? `Ref ${error.digest} · ` : ""}{error.message}</p>
    </div>
  );
}
