"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cinematic hero background. The poster renders immediately (and is the only
 * thing shown to reduced-motion or data-saver visitors); the muted looping
 * video loads after first paint and never plays sound.
 */
export function HeroMedia({ videoUrl, poster }: { videoUrl: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!videoUrl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!reduce && !saveData) setShowVideo(true);
  }, [videoUrl]);

  return (
    <div className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" className="h-full w-full object-cover" fetchPriority="high" />
      {showVideo && (
        <video
          ref={ref}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ${ready ? "opacity-100" : "opacity-0"}`}
          src={videoUrl}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          onCanPlay={() => setReady(true)}
        />
      )}
    </div>
  );
}
