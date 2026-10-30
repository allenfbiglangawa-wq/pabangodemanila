"use client";

import { useEffect } from "react";

// Last-resort screen when the root layout itself fails; same one-time reload for stale script files.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    try {
      if (/Loading chunk|ChunkLoadError|dynamically imported module/i.test(error.message) && !sessionStorage.getItem("pdm-reloaded")) {
        sessionStorage.setItem("pdm-reloaded", "1");
        window.location.reload();
      }
    } catch {}
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#d9d3c7", color: "#292724", textAlign: "center", padding: "120px 20px" }}>
        <h1 style={{ fontSize: 28 }}>Something went wrong</h1>
        <p>Please reload the page. If it keeps happening, send us a screenshot of this message.</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 24, padding: "12px 28px", background: "#781d16", color: "#fff", border: 0, borderRadius: 6 }}>Reload page</button>
        <p style={{ marginTop: 32, fontSize: 12, opacity: 0.7, wordBreak: "break-word" }}>{error.digest ? `Ref ${error.digest} · ` : ""}{error.message}</p>
      </body>
    </html>
  );
}
