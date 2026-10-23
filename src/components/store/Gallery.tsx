"use client";

import { useState } from "react";

export function Gallery({ images, name, videoUrl }: { images: { url: string; alt: string }[]; name: string; videoUrl?: string | null }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [{ url: "/placeholders/bottle-1.svg", alt: name }];
  const showVideo = videoUrl && i === list.length;
  return (
    // On large screens the thumbnail column scrolls inside the main image's height, so a long
    // list of thumbnails can't stretch the main picture and crop it.
    <div className="flex min-w-0 flex-col-reverse gap-4 lg:grid lg:grid-cols-[5rem_1fr]">
      {(list.length > 1 || videoUrl) && (
        <div className="lg:relative">
          <div className="flex gap-3 overflow-x-auto lg:absolute lg:inset-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
            {list.map((img, n) => (
              <button key={img.url + n} onClick={() => setI(n)} className={`aspect-[4/5] w-16 shrink-0 overflow-hidden border bg-ivory lg:w-full ${n === i ? "border-charcoal" : "border-transparent"}`} aria-label={`Show image ${n + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-contain" />
              </button>
            ))}
            {videoUrl && (
              <button onClick={() => setI(list.length)} className={`flex aspect-[4/5] w-16 shrink-0 items-center justify-center border bg-ivory text-[10px] uppercase tracking-widest lg:w-full ${showVideo ? "border-charcoal" : "border-line"}`}>
                Video
              </button>
            )}
          </div>
        </div>
      )}
      <div className={`relative aspect-[4/5] flex-1 ${list.length > 1 || videoUrl ? "" : "lg:col-span-2"} overflow-hidden bg-ivory`}>
        {showVideo ? (
          <video src={videoUrl!} controls playsInline className="h-full w-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={list[i]?.url} alt={list[i]?.alt || name} className="h-full w-full object-contain" />
        )}
      </div>
    </div>
  );
}
