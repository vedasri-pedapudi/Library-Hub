// Chart building blocks. Single-series charts use one gold hue (no legend —
// the title names the series). Status breakdowns use the reserved status
// colors with direct labels + an icon legend, never color alone.
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const AXIS = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-ivory">{payload[0]?.value} {unit}</p>
    </div>
  );
}

export function TrendChart({ data, unit, height = 220 }: { data: { label: string; value: number }[]; unit: string; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={`Trend of ${unit}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="gold-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
          <XAxis dataKey="label" {...AXIS} minTickGap={24} />
          <YAxis {...AXIS} allowDecimals={false} width={40} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: "var(--gold)", strokeOpacity: 0.4 }} />
          <Area type="monotone" dataKey="value" stroke="var(--gold)" strokeWidth={2} fill="url(#gold-fill)" activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ColumnChart({ data, unit, height = 220 }: { data: { label: string; value: number }[]; unit: string; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={`${unit}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap={6}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} allowDecimals={false} width={40} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "var(--accent)", fillOpacity: 0.25 }} />
          <Bar dataKey="value" fill="var(--gold)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal ranked bars in plain HTML — readable labels, hover title per row. */
export function RankedBars({ rows, unit, max }: { rows: { label: ReactNode; value: number; key: string }[]; unit: string; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.key} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs" title={`${r.value} ${unit}`}>
          <span className="truncate text-ivory">{r.label}</span>
          <span className="text-muted-foreground tabular-nums">{r.value}</span>
          <span className="col-span-2 h-2 overflow-hidden rounded-full bg-secondary/70">
            <span className="block h-full rounded-full bg-gold transition-[width] duration-700 group-hover:bg-gold-soft" style={{ width: `${(r.value / top) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface Segment {
  key: string;
  label: string;
  value: number;
  colorClass: string;
  icon: ReactNode;
}

/** 100% stacked bar with 2px gaps, direct labels and an icon legend. */
export function StatusBar({ segments }: { segments: Segment[] }) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  return (
    <div>
      <div className="flex h-9 gap-[2px] overflow-hidden rounded-md" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}>
        {segments.filter((s) => s.value > 0).map((s) => {
          const pct = (s.value / total) * 100;
          return (
            <div key={s.key} className={cn("flex items-center justify-center text-[11px] font-semibold text-ink transition-[flex-grow] duration-700", s.colorClass)} style={{ flexGrow: s.value, flexBasis: 0 }} title={`${s.label}: ${s.value} (${Math.round(pct)}%)`}>
              {pct >= 8 && s.value}
            </div>
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className={cn("grid size-4 place-items-center rounded-sm text-ink [&_svg]:size-2.5", s.colorClass)} aria-hidden="true">{s.icon}</span>
            {s.label} <span className="text-ivory tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
