"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarClock, LifeBuoy, Lock, Sparkles } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PriorityBadge } from "@/components/ui/Badge";
import { ProgressBar, ProgressRing } from "@/components/ui/ProgressRing";
import { useToast } from "@/components/ui/Toast";
import { api, cn } from "@/lib/client";
import { minutesToLabel } from "@/lib/dates";
import type { Achievement, DashboardDTO, RecoveryPlan, RewardDTO } from "@/lib/types";

// ---------- Consistency heatmap (GitHub-style) ----------
export function Heatmap({ data }: { data: DashboardDTO["charts"]["heatmap"] }) {
  const weeks: (typeof data)[] = [];
  for (let i = 0; i < data.length; i += 7) weeks.push(data.slice(i, i + 7));
  const shades = [
    "bg-black/[0.06] dark:bg-white/[0.06]",
    "bg-brand-500/25",
    "bg-brand-500/50",
    "bg-brand-500/75",
    "bg-brand-500",
  ];
  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((d) => (
              <div
                key={d.date}
                title={`${format(parseISO(d.date), "EEE, MMM d")}: ${minutesToLabel(d.minutes)}`}
                className={cn("h-3.5 w-3.5 rounded-[4px] transition hover:scale-125", shades[d.level])}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-ink-soft dark:text-zinc-500">
        Less {shades.map((s, i) => <span key={i} className={cn("h-3 w-3 rounded-[3px]", s)} />)} More
      </div>
    </div>
  );
}

// ---------- Recovery plan (firm but kind) ----------
export function RecoveryCard({ recovery, onChanged }: { recovery: RecoveryPlan; onChanged: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  if (!recovery.needed) return null;

  const reschedule = async () => {
    setBusy(true);
    try {
      const res = await api<{ rescheduled: number }>("/api/tasks/reschedule", { method: "POST" });
      toast(`Rescheduled ${res.rescheduled} task${res.rescheduled === 1 ? "" : "s"} across your next working days 💪`);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't reschedule", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-5 shadow-soft animate-fade-up dark:from-amber-500/10 dark:via-orange-500/5 dark:to-rose-500/10 sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Recovery plan</div>
          <h3 className="mt-0.5 text-lg font-bold tracking-tight">{recovery.headline}</h3>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{recovery.message}</p>
          {recovery.deficitMinutes > 0 && (
            <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Gap this week: <span className="font-bold">{minutesToLabel(recovery.deficitMinutes)}</span>
            </p>
          )}
          <ol className="mt-3 space-y-2">
            {recovery.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          {recovery.overdueTasks.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {recovery.overdueTasks.slice(0, 4).map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium dark:bg-zinc-900/60">
                  <PriorityBadge priority={t.priority} /> {t.title}
                </span>
              ))}
            </div>
          )}
        </div>
        {recovery.overdueTasks.length > 0 && (
          <Button onClick={reschedule} loading={busy} className="bg-none bg-amber-500 shadow-lg shadow-amber-500/30 hover:bg-amber-600">
            <CalendarClock className="h-4 w-4" /> Reschedule overdue
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------- Achievement badge ----------
export function AchievementBadge({ a, compact }: { a: Achievement; compact?: boolean }) {
  return (
    <div
      className={cn(
        "group relative flex flex-col items-center rounded-2xl p-3 text-center transition",
        a.unlocked ? "bg-gradient-to-b from-brand-500/10 to-transparent" : "opacity-70",
      )}
      title={`${a.title}: ${a.description} (${a.current}/${a.target})`}
    >
      <div className="relative">
        <ProgressRing value={a.progress} size={compact ? 56 : 72} stroke={compact ? 5 : 6} colorTo="rgb(var(--brand-alt))">
          <span className={cn(compact ? "text-xl" : "text-2xl", !a.unlocked && "grayscale")}>{a.emoji}</span>
        </ProgressRing>
        {!a.unlocked && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
            <Lock className="h-3 w-3 text-zinc-500" />
          </span>
        )}
      </div>
      <div className="mt-2 text-xs font-semibold leading-tight">{a.title}</div>
      {!compact && <div className="mt-0.5 text-[11px] leading-tight text-ink-soft dark:text-zinc-500">{a.description}</div>}
      {!a.unlocked && <div className="mt-1 text-[10px] font-medium text-ink-soft dark:text-zinc-500">{a.current}/{a.target}</div>}
    </div>
  );
}

// ---------- Reward (MacBook / iPhone / Watch) ----------
const REWARD_GRADIENTS = [
  "from-rose-500 via-pink-500 to-fuchsia-500",
  "from-sky-500 via-blue-500 to-indigo-500",
  "from-violet-500 via-purple-500 to-fuchsia-600",
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-amber-500 via-orange-500 to-rose-500",
];

export function RewardCard({
  reward,
  index,
  onClaim,
  actions,
}: {
  reward: RewardDTO;
  index: number;
  onClaim?: (r: RewardDTO) => void;
  actions?: React.ReactNode;
}) {
  const gradient = REWARD_GRADIENTS[index % REWARD_GRADIENTS.length];
  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-lg animate-fade-up", gradient)} style={{ animationDelay: `${index * 80}ms` }}>
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div className={cn("text-5xl drop-shadow", reward.unlocked && "animate-float")}>{reward.emoji}</div>
        <div className="flex items-center gap-1">
          {actions}
          {reward.claimedAt ? (
            <span className="rounded-full bg-white/25 px-2.5 py-1 text-xs font-bold">Claimed 🎉</span>
          ) : reward.unlocked ? (
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-zinc-900">Unlocked!</span>
          ) : null}
        </div>
      </div>
      <div className="relative mt-4 text-xl font-bold tracking-tight">{reward.title}</div>
      {reward.description && <div className="relative mt-0.5 text-sm text-white/80">{reward.description}</div>}
      <div className="relative mt-4">
        <div className="mb-1.5 flex justify-between text-xs font-semibold">
          <span>{reward.progress}%</span>
          <span>{reward.unlocked ? "Earned" : `${reward.remainingXp.toLocaleString()} XP to go`}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-all duration-1000" style={{ width: `${reward.progress}%` }} />
        </div>
        <div className="mt-1.5 text-[11px] text-white/70">Target: {reward.targetXp.toLocaleString()} XP</div>
      </div>
      {onClaim && reward.unlocked && !reward.claimedAt && (
        <button
          onClick={() => onClaim(reward)}
          className="relative mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-zinc-900 transition hover:scale-[1.03]"
        >
          <Sparkles className="h-4 w-4" /> Claim reward
        </button>
      )}
    </div>
  );
}

// ---------- Small stat card ----------
export function StatCard({
  label,
  value,
  sub,
  icon,
  gradient,
  progress,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  progress?: number;
  delay?: number;
}) {
  return (
    <Card hover className="relative overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-xl", gradient)} />
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg", gradient)}>{icon}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-soft dark:text-zinc-500">{sub}</div>}
      {progress !== undefined && <ProgressBar value={progress} className="mt-3" />}
    </Card>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <CardTitle title={String(children)} />;
}
