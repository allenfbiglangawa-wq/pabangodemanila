import { formatPHP } from "@/lib/money";

/**
 * Single-series revenue bar chart (server-rendered SVG). One hue, thin bars
 * with rounded data-ends on a recessive grid; each bar has a hover tooltip
 * and an enlarged hit target. A table view sits under the chart.
 */
export function BarChart({ data, label }: { data: { key: string; value: number }[]; label: string }) {
  const W = 760, H = 240, padL = 64, padB = 28, padT = 12;
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const plotW = W - padL - 8, plotH = H - padT - padB;
  const step = plotW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(28, step * 0.6));
  const ticks = [0, 0.5, 1].map((t) => t * nice);
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label}, ${data.length} periods`}>
        {ticks.map((t) => {
          const y = padT + plotH - (t / nice) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="#e7e2d8" strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b665e">{compact(t)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / nice) * plotH;
          const x = padL + i * step + (step - barW) / 2;
          const y = padT + plotH - h;
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={d.key} className="group">
              <rect x={padL + i * step} y={padT} width={step} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${padT + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${padT + plotH} Z`}
                  className="fill-[#8d7a5b] transition-opacity group-hover:fill-[#292724]"
                />
              )}
              <title>{`${d.key}: ${formatPHP(d.value)}`}</title>
              {i % labelEvery === 0 && (
                <text x={padL + i * step + step / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b665e">{shortKey(d.key)}</text>
              )}
            </g>
          );
        })}
        <line x1={padL} x2={W - 8} y1={padT + plotH} y2={padT + plotH} stroke="#cfc8bb" />
      </svg>
      <details className="mt-2 text-[12px]">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <table className="admin-table mt-2"><thead><tr><th>Period</th><th className="text-right">{label}</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.key}><td>{d.key}</td><td className="text-right">{formatPHP(d.value)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((n) => n >= v) ?? v;
}
function compact(centavos: number) {
  const p = centavos / 100;
  return p >= 1e6 ? `₱${(p / 1e6).toFixed(1)}M` : p >= 1e3 ? `₱${(p / 1e3).toFixed(p >= 1e4 ? 0 : 1)}k` : `₱${p.toFixed(0)}`;
}
function shortKey(k: string) {
  return k.length === 10 ? k.slice(5) : k;
}
