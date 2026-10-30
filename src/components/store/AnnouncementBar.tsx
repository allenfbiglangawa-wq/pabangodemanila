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
    <div className="border-b border-maroon/10 bg-pearl text-maroon">
      <p key={i} className="container-luxe animate-fade-up py-2 text-center text-[12px] tracking-[0.04em]" aria-live="polite">
        {messages[i]}
      </p>
    </div>
  );
}
