"use client";
import { Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { AchievementBadge } from "@/components/dashboard/Widgets";
import { RewardsManager } from "@/components/RewardsManager";
import { useFetch } from "@/lib/client";
import { XP_RULES } from "@/lib/constants";
import type { DashboardDTO } from "@/lib/types";

const MILESTONE_MESSAGES = [
  { at: 0, text: "Every expert was once a beginner. Your journey starts with one session." },
  { at: 500, text: "You've proven you can show up. Now make it automatic." },
  { at: 1500, text: "Apple Watch territory — consistency is officially your superpower." },
  { at: 3500, text: "iPhone unlocked energy. You're interview-ready — keep sharpening." },
  { at: 6000, text: "MacBook level. You didn't just study — you transformed." },
];

export default function RewardsPage() {
  const { data, error, loading, reload, hardReload } = useFetch<DashboardDTO>("/api/dashboard");

  if (loading && !data)
    return (
      <div className="space-y-5">
        <Skeleton className="h-48 rounded-[2rem]" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={hardReload} />;

  const { xp, achievements, streak } = data;
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const message = [...MILESTONE_MESSAGES].reverse().find((m) => xp.total >= m.at)?.text;

  return (
    <div className="space-y-6">
      <PageHeader emoji="🏆" title="Rewards & Milestones" subtitle="Earn XP from real work. Unlock the things you've been dreaming about." />

      <div className="relative overflow-hidden rounded-[2rem] bg-zinc-950 p-6 text-white shadow-2xl animate-fade-up sm:p-8">
        <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-64 w-64 rounded-full blur-3xl" style={{ background: "rgb(var(--brand-alt) / 0.35)" }} />
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <ProgressRing value={xp.levelProgress} size={130} stroke={12} track="rgba(255,255,255,0.12)" colorTo="rgb(var(--brand-alt))">
            <div className="text-[11px] uppercase text-white/60">Level</div>
            <div className="text-4xl font-black">{xp.level}</div>
          </ProgressRing>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-4xl font-black tracking-tight">
              <Zap className="h-8 w-8 text-amber-400" /> {xp.total.toLocaleString()} XP
            </div>
            <p className="mt-1 text-white/70">{(xp.nextLevelXp - xp.total).toLocaleString()} XP to level {xp.level + 1}</p>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/85">{message}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <Flame className="mx-auto h-6 w-6 text-orange-400" />
              <div className="mt-1 text-2xl font-black">{streak.current}</div>
              <div className="text-[11px] text-white/60">day streak</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <Trophy className="mx-auto h-6 w-6 text-amber-300" />
              <div className="mt-1 text-2xl font-black">{unlocked}</div>
              <div className="text-[11px] text-white/60">badges</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-bold tracking-tight">Dream rewards</h2>
        <RewardsManager onChanged={reload} />
      </div>

      <Card>
        <CardTitle icon={<Trophy className="h-4 w-4" />} title="Achievement badges" subtitle={`${unlocked} of ${achievements.length} unlocked — keep collecting`} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {[...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.progress - a.progress).map((a) => (
            <AchievementBadge key={a.id} a={a} />
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle icon={<Sparkles className="h-4 w-4" />} title="How you earn XP" subtitle="Transparent and fair — XP only comes from real work." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["⏱️", `1 XP`, `every ${XP_RULES.perStudyMinutes} minutes studied`],
            ["✅", `${XP_RULES.task} XP`, "per completed task"],
            ["🎯", `${XP_RULES.goal} XP`, "per completed goal"],
            ["🧩", `${XP_RULES.dsa.EASY} / ${XP_RULES.dsa.MEDIUM} / ${XP_RULES.dsa.HARD} XP`, "easy / medium / hard problem"],
            ["📋", `${XP_RULES.checklistItem} XP`, "per checklist item mastered"],
          ].map(([emoji, xpText, label]) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/5">
              <span className="text-2xl">{emoji}</span>
              <div>
                <div className="font-bold">{xpText}</div>
                <div className="text-xs text-ink-soft">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
