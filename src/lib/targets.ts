// Shared (client + server) helpers for per-weekday study targets.

export type TargetSettings = { workingDays: string; dayTargets: string; dailyTargetMinutes: number };

/** Minutes targeted for each weekday, Sunday first. Falls back to workingDays × dailyTarget. */
export function dayTargetsOf(s: TargetSettings): number[] {
  const parsed = s.dayTargets.split(",").filter(Boolean).map(Number);
  if (parsed.length === 7 && parsed.every((n) => Number.isFinite(n))) return parsed;
  const working = new Set(s.workingDays.split(",").filter(Boolean).map(Number));
  return Array.from({ length: 7 }, (_, i) => (working.has(i) ? s.dailyTargetMinutes : 0));
}

export function targetFor(s: TargetSettings, d: Date) {
  return dayTargetsOf(s)[d.getDay()];
}

/** Days with a study target > 0. Rest days never break a streak. */
export function workingDaySet(s: TargetSettings) {
  const t = dayTargetsOf(s);
  return new Set(t.map((m, i) => (m > 0 ? i : -1)).filter((i) => i >= 0));
}
