"use client";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { useSettings } from "@/components/layout/SettingsProvider";
import { ACCENT_HEX } from "@/lib/constants";
import { minutesToLabel } from "@/lib/dates";
import type { DashboardDTO } from "@/lib/types";

type Range = "daily" | "weekly" | "monthly";

export function ProgressCharts({ charts }: { charts: DashboardDTO["charts"] }) {
  const [range, setRange] = useState<Range>("daily");
  const { settings, resolvedTheme } = useSettings();
  const accent = ACCENT_HEX[settings?.accent ?? "violet"] ?? ACCENT_HEX.violet;
  const grid = resolvedTheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tick = { fill: resolvedTheme === "dark" ? "#a1a1aa" : "#6e6e73" };
  const tooltipStyle = {
    contentStyle: {
      background: resolvedTheme === "dark" ? "#18181b" : "#fff",
      borderRadius: 12,
      border: "none",
      fontSize: 12,
    },
    labelStyle: { fontWeight: 600, color: resolvedTheme === "dark" ? "#fafafa" : "#1d1d1f" },
  };

  return (
    <Card className="lg:col-span-2" style={{ animationDelay: "120ms" }}>
      <CardTitle
        icon={<BarChart3 className="h-4 w-4" />}
        title="Study progress"
        subtitle={range === "daily" ? "Last 14 days vs. daily target" : range === "weekly" ? "Last 8 weeks vs. weekly target" : "Last 6 months"}
        action={
          <Tabs<Range>
            value={range}
            onChange={setRange}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
        }
      />
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {range === "daily" ? (
            <ComposedChart data={charts.daily} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent.main} />
                  <stop offset="100%" stopColor={accent.alt} stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={grid} />
              <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 60)}h`} />
              <Tooltip
                {...tooltipStyle}
                cursor={{ fill: grid }}
                formatter={(v: number, name: string) => [minutesToLabel(v), name === "minutes" ? "Studied" : "Target"]}
              />
              <Bar dataKey="minutes" radius={[8, 8, 4, 4]} maxBarSize={28} animationDuration={900}>
                {charts.daily.map((d) => (
                  <Cell key={d.date} fill={d.target && d.minutes >= d.target ? "#30d158" : "url(#barGrad)"} />
                ))}
              </Bar>
              <Line type="stepAfter" connectNulls={false} dataKey="target" stroke="#ff9f0a" strokeDasharray="5 5" dot={false} strokeWidth={2} />
            </ComposedChart>
          ) : range === "weekly" ? (
            <AreaChart data={charts.weekly} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent.main} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={accent.main} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={grid} />
              <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 60)}h`} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number, name: string) => [minutesToLabel(v), name === "minutes" ? "Studied" : "Target"]}
              />
              <Area type="monotone" dataKey="target" stroke="#ff9f0a" strokeDasharray="5 5" fill="none" strokeWidth={2} />
              <Area type="monotone" dataKey="minutes" stroke={accent.main} strokeWidth={3} fill="url(#areaGrad)" animationDuration={900} />
            </AreaChart>
          ) : (
            <BarChart data={charts.monthly} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={grid} />
              <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: grid }} />
              <Bar dataKey="hours" name="Hours studied" fill={accent.main} radius={[8, 8, 4, 4]} maxBarSize={32} />
              <Bar dataKey="problems" name="DSA solved" fill="#0a84ff" radius={[8, 8, 4, 4]} maxBarSize={32} />
              <Bar dataKey="tasks" name="Tasks done" fill="#30d158" radius={[8, 8, 4, 4]} maxBarSize={32} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-soft dark:text-zinc-400">
        {range === "monthly" ? (
          <>
            <Legend color={accent.main} label="Hours studied" />
            <Legend color="#0a84ff" label="DSA solved" />
            <Legend color="#30d158" label="Tasks done" />
          </>
        ) : (
          <>
            <Legend color={accent.main} label="Studied" />
            {range === "daily" && <Legend color="#30d158" label="Target hit" />}
            <Legend color="#ff9f0a" label="Target" dashed />
          </>
        )}
      </div>
    </Card>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-4 rounded-full" style={dashed ? { borderTop: `2px dashed ${color}`, height: 0 } : { background: color }} />
      {label}
    </span>
  );
}
