"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductCardData } from "@/lib/catalog";
import { formatPHP } from "@/lib/money";
import { CloseIcon } from "../Icons";
import { AddToCartForm } from "./AddToCartForm";

export function QuickView({ p }: { p: ProductCardData }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full bg-pearl/95 py-3 text-[11px] font-medium uppercase tracking-[0.2em] backdrop-blur transition-colors hover:bg-charcoal hover:text-pearl max-lg:border max-lg:border-line">
        Quick View
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="m-auto w-[min(920px,94vw)] max-h-[92vh] overflow-auto bg-pearl p-0 text-charcoal backdrop:bg-charcoal/40 backdrop:backdrop-blur-sm"
        aria-label={`${p.name} quick view`}
      >
        {open && (
          <div className="grid md:grid-cols-2">
            <div className="relative aspect-[4/5] bg-ivory">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image ?? "/placeholders/bottle-1.svg"} alt={p.name} className="h-full w-full object-cover" />
            </div>
            <div className="relative space-y-5 p-8 md:p-10">
              <button className="absolute right-4 top-4 p-2" onClick={() => setOpen(false)} aria-label="Close quick view">
                <CloseIcon className="h-5 w-5" />
              </button>
              {p.family && <p className="eyebrow">{p.family}</p>}
              <h2 className="display text-4xl">{p.name}</h2>
              <p className="text-[16px]">{formatPHP(p.minPrice)}</p>
              <p className="line-clamp-4 text-[14px] leading-relaxed text-muted">{p.description}</p>
              <AddToCartForm variants={p.variants} />
              <Link href={`/products/${p.slug}`} className="btn-link">
                View full details
              </Link>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
