"use client";
import { useEffect, useState } from "react";

/** Animated circular progress ring (Apple Watch style). */
export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  color = "rgb(var(--brand-500))",
  colorTo,
  track = "rgb(127 127 127 / 0.15)",
  children,
}: {
  value: number; // 0-100 (can exceed 100)
  size?: number;
  stroke?: number;
  color?: string;
  colorTo?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(Math.max(0, value)), 60);
    return () => clearTimeout(t);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(shown, 100) / 100;
  const gid = `g-${color.replace(/[^a-z0-9]/gi, "")}-${size}`;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={colorTo ?? color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}

/** Three concentric rings like Apple Fitness. */
export function ActivityRings({
  rings,
  size = 180,
}: {
  rings: { value: number; color: string; colorTo: string }[];
  size?: number;
}) {
  const stroke = Math.round(size * 0.1);
  const gap = 3;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {rings.map((r, i) => {
        const s = size - i * (stroke + gap) * 2;
        return (
          <div key={i} className="absolute" style={{ top: (size - s) / 2, left: (size - s) / 2 }}>
            <ProgressRing value={r.value} size={s} stroke={stroke} color={r.color} colorTo={r.colorTo} track={`${r.color}26`} />
          </div>
        );
      })}
    </div>
  );
}

export function ProgressBar({ value, className = "", color }: { value: number; className?: string; color?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(Math.min(100, Math.max(0, value))), 60);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10 ${className}`}>
      <div
        className={color ? "h-full rounded-full" : "h-full rounded-full bg-brand-gradient"}
        style={{ width: `${shown}%`, background: color, transition: "width 1s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </div>
  );
}
