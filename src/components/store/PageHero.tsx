export function PageHero({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <header className="container-luxe pb-12 pt-16 text-center lg:pb-20 lg:pt-24">
      {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
      <h1 className="display mx-auto max-w-4xl text-5xl lg:text-7xl">{title}</h1>
      {intro && <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-muted">{intro}</p>}
    </header>
  );
}

export function Pending({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-xl border border-dashed border-sand bg-ivory p-8 text-center text-[14px] text-muted">
      {what} will be published here once it has been confirmed by Pabango de Manila.
    </div>
  );
}
