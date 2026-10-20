"use client";

import { useState } from "react";

export function Gallery({ images, name, videoUrl }: { images: { url: string; alt: string }[]; name: string; videoUrl?: string | null }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [{ url: "/placeholders/bottle-1.svg", alt: name }];
  const showVideo = videoUrl && i === list.length;
  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      {(list.length > 1 || videoUrl) && (
        <div className="flex gap-3 lg:w-20 lg:flex-col">
          {list.map((img, n) => (
            <button key={img.url + n} onClick={() => setI(n)} className={`aspect-[4/5] w-16 overflow-hidden border lg:w-full ${n === i ? "border-charcoal" : "border-transparent"}`} aria-label={`Show image ${n + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          {videoUrl && (
            <button onClick={() => setI(list.length)} className={`flex aspect-[4/5] w-16 items-center justify-center border bg-ivory text-[10px] uppercase tracking-widest lg:w-full ${showVideo ? "border-charcoal" : "border-line"}`}>
              Video
            </button>
          )}
        </div>
      )}
      <div className="relative aspect-[4/5] flex-1 overflow-hidden bg-ivory">
        {showVideo ? (
          <video src={videoUrl!} controls playsInline className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={list[i]?.url} alt={list[i]?.alt || name} className="h-full w-full object-cover" />
        )}
      </div>
    </div>
  );
}
