"use client";

import { useEffect, useState } from "react";

export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), 5000);
    return () => clearInterval(t);
  }, [messages.length]);
  if (!messages.length) return null;
  return (
    <div className="bg-charcoal text-pearl">
      <p key={i} className="container-luxe animate-fade-up py-2.5 text-center text-[11px] uppercase tracking-[0.24em]" aria-live="polite">
        {messages[i]}
      </p>
    </div>
  );
}
