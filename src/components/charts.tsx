import { getT } from "@/i18n/server";
import { fmtG, fmtNum } from "@/lib/format";

export const FAMILY_COLORS: Record<string, string> = {
  PLA: "#4ade80", "PLA+": "#22c55e", PETG: "#38bdf8", PCTG: "#0ea5e9", ABS: "#f97316", ASA: "#fb923c", TPU: "#f472b6", TPE: "#ec4899",
  "PA/Nylon": "#a78bfa", PC: "#c084fc", PP: "#facc15", PVA: "#94a3b8", HIPS: "#cbd5e1", PVB: "#67e8f9", PET: "#60a5fa", PPS: "#e879f9", Kompozit: "#f43f5e", Egyéb: "#64748b",
};
export const familyColor = (f: string) => FAMILY_COLORS[f] ?? "#64748b";

export async function Donut({ data, total, centerLabel }: { data: { label: string; value: number; color: string }[]; total: number; centerLabel: string }) {
  const { t, locale } = await getT();
  const R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = data.filter((d) => d.value > 0);
  return (
    <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label={t("ui.donut.aria", { list: segs.map((s) => `${s.label} ${fmtG(s.value, locale)}`).join(", ") })}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-line)" strokeWidth="14" />
      {total > 0 &&
        segs.map((d, i) => {
          const len = (d.value / total) * C;
          const el = (
            <circle key={d.label} className="donut-seg" cx="70" cy="70" r={R} fill="none" stroke={d.color} strokeWidth="14"
              strokeDasharray={`${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}`} strokeDashoffset={-acc}
              style={{ ["--len" as string]: `${len}`, animationDelay: `${i * 70}ms` }}>
              <title>{`${d.label}: ${fmtG(d.value, locale)}`}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
      <g className="rotate-90" style={{ transformOrigin: "70px 70px" }}>
        <text x="70" y="66" textAnchor="middle" className="fill-fg text-[17px] font-semibold">{fmtNum(total / 1000, 2, locale)}</text>
        <text x="70" y="82" textAnchor="middle" className="fill-faint text-[9px] uppercase tracking-widest">{centerLabel}</text>
      </g>
    </svg>
  );
}

export function BarList({ rows }: { rows: { label: string; value: number; color: string; right: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
              {r.label}
            </span>
            <span className="tabular-nums text-muted">{r.right}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="bar-fill h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: `linear-gradient(90deg, ${r.color}99, ${r.color})`, animationDelay: `${i * 60}ms` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tekercs töltöttségi sáv. Ismeretlen maradéknál csíkozott, üres sáv – nem találunk ki értéket. */
export async function Gauge({ value, max, basis }: { value: number | null; max: number | null; basis: string }) {
  const { t } = await getT();
  const pct = value !== null && max ? Math.max(0, Math.min(100, (value / max) * 100)) : null;
  const color = pct === null ? "transparent" : pct <= 20 ? "var(--color-danger)" : pct <= 45 ? "var(--color-warn)" : "var(--color-ok)";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined} aria-label={pct === null ? t("ui.gauge.unknown") : t("ui.gauge.approx", { pct: Math.round(pct) })}
      style={pct === null ? { backgroundImage: "repeating-linear-gradient(135deg, var(--color-line) 0 6px, transparent 6px 12px)" } : undefined}>
      {pct !== null && <div className="bar-fill h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: basis === "estimate" ? 0.65 : 1 }} />}
    </div>
  );
}

/** Hőmérséklet-tartomány sáv közös skálán (összehasonlításhoz). */
export function RangeBar({ min, max, lo, hi, color = "var(--color-accent)" }: { min: number | null; max: number | null; lo: number; hi: number; color?: string }) {
  if (min === null && max === null) return <div className="h-1.5 rounded-full bg-line/60" />;
  const a = min ?? max!, b = max ?? min!;
  const left = ((a - lo) / (hi - lo)) * 100, width = Math.max(2.5, ((b - a) / (hi - lo)) * 100);
  return (
    <div className="relative h-1.5 rounded-full bg-line">
      <div className="absolute h-full rounded-full" style={{ left: `${Math.max(0, Math.min(97, left))}%`, width: `${Math.min(100 - Math.max(0, left), width)}%`, background: color }} />
    </div>
  );
}
