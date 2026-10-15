"use client";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  Flame,
  ListChecks,
  Plus,
  Rocket,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PriorityBadge } from "@/components/ui/Badge";
import { ActivityRings, ProgressBar, ProgressRing } from "@/components/ui/ProgressRing";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { ProgressCharts } from "@/components/dashboard/ProgressCharts";
import { AchievementBadge, Heatmap, RecoveryCard, RewardCard, StatCard } from "@/components/dashboard/Widgets";
import { api, cn, useFetch } from "@/lib/client";
import { RING_COLORS, SKILL_COLOR_HEX } from "@/lib/constants";
import { minutesToLabel } from "@/lib/dates";
import type { DashboardDTO, TaskDTO } from "@/lib/types";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function DashboardPage() {
  const { data, error, loading, reload, hardReload } = useFetch<DashboardDTO>("/api/dashboard");
  const { toast, celebrate } = useToast();

  if (loading && !data) return <DashboardSkeleton />;
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={hardReload} />;

  const d = data;
  const studyPct = pct(d.today.minutes, d.today.target);
  const taskPct = d.today.tasksTotal ? pct(d.today.tasksDone, d.today.tasksTotal) : 0;
  const dsaPct = pct(d.today.dsaSolved, d.today.dsaTarget);
  const unlocked = d.achievements.filter((a) => a.unlocked);
  const nextAchievements = d.achievements.filter((a) => !a.unlocked).sort((a, b) => b.progress - a.progress);

  const toggleTask = async (t: TaskDTO) => {
    try {
      await api(`/api/tasks/${t.id}`, { method: "PATCH", body: { completed: !t.completed } });
      if (!t.completed) celebrate("Task done! +10 XP ✨");
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update task", "error");
    }
  };

  return (
    <div className="space-y-5">
      {/* ---------- Hero ---------- */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-[2rem] bg-zinc-950 p-6 text-white shadow-2xl animate-fade-up sm:p-8 lg:col-span-2">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand-500/40 blur-3xl" />
          <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full blur-3xl" style={{ background: "rgb(var(--brand-alt) / 0.35)" }} />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-md">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/70">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                  <CalendarDays className="h-3.5 w-3.5" /> {format(new Date(), "EEEE, MMMM d")}
                </span>
                {d.plan.started && !d.plan.ended && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                    <Rocket className="h-3.5 w-3.5" /> Week {d.plan.week} of {d.plan.weeks}
                  </span>
                )}
                {!d.today.isWorkingDay && <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-emerald-300">Rest day 🌿</span>}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{d.greeting} 👋</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-white/75">{d.encouragement}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/sessions">
                  <Button size="md"><Clock className="h-4 w-4" /> Log study time</Button>
                </Link>
                <Link href="/goals">
                  <Button size="md" variant="secondary" className="border-white/10 bg-white/10 text-white hover:bg-white/20 dark:bg-white/10">
                    <Plus className="h-4 w-4" /> Add task
                  </Button>
                </Link>
                <Link href="/dsa">
                  <Button size="md" variant="secondary" className="border-white/10 bg-white/10 text-white hover:bg-white/20 dark:bg-white/10">
                    <Code2 className="h-4 w-4" /> Log problem
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <ActivityRings
                size={170}
                rings={[
                  { value: studyPct, ...RING_COLORS.study },
                  { value: taskPct, ...RING_COLORS.tasks },
                  { value: dsaPct, ...RING_COLORS.dsa },
                ]}
              />
              <div className="space-y-3 text-sm">
                <RingLegend color={RING_COLORS.study.color} label="Study" value={`${minutesToLabel(d.today.minutes)} / ${minutesToLabel(d.today.target)}`} />
                <RingLegend color={RING_COLORS.tasks.color} label="Tasks" value={`${d.today.tasksDone} / ${d.today.tasksTotal || 0}`} />
                <RingLegend color={RING_COLORS.dsa.color} label="DSA" value={`${d.today.dsaSolved} / ${d.today.dsaTarget}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Streak + XP */}
        <Card className="flex flex-col justify-between overflow-hidden" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft dark:text-zinc-400">Current streak</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tight text-gradient">{d.streak.current}</span>
                <span className="text-sm font-semibold text-ink-soft">day{d.streak.current === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-1 text-xs text-ink-soft dark:text-zinc-500">
                Best: {d.streak.best} days · counts at {d.streak.minMinutes}+ min
              </div>
            </div>
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-lg shadow-orange-500/30", d.streak.current > 0 && "animate-float")}>
              <Flame className="h-8 w-8" />
            </div>
          </div>
          {d.focus && (
            <Link href="/week" className="mt-4 block rounded-2xl bg-brand-500/[0.07] p-3.5 transition hover:bg-brand-500/[0.12]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">This week&apos;s focus</div>
              <div className="mt-0.5 text-sm font-semibold leading-snug">{d.focus.title}</div>
              <div className="mt-2 flex items-center gap-2">
                <ProgressBar value={pct(d.focus.done, d.focus.total)} />
                <span className="shrink-0 text-[11px] font-semibold text-ink-soft">
                  {d.focus.done}/{d.focus.total}
                </span>
              </div>
            </Link>
          )}
          {d.jobs.total > 0 && (
            <Link href="/applications" className="mt-2 flex items-center justify-between rounded-2xl bg-black/[0.03] px-3.5 py-2.5 text-xs transition hover:bg-black/[0.06] dark:bg-white/5">
              <span className="font-semibold">💼 Job search</span>
              <span className="text-ink-soft">
                {d.jobs.thisWeek} this week · {d.jobs.interviewing} interviewing · <b className="text-emerald-600 dark:text-emerald-400">{d.jobs.offers} offers</b>
              </span>
            </Link>
          )}
          <div className="my-5 h-px bg-black/5 dark:bg-white/10" />
          <div className="flex items-center gap-4">
            <ProgressRing value={d.xp.levelProgress} size={78} stroke={8} colorTo="rgb(var(--brand-alt))">
              <div className="text-[10px] font-semibold uppercase text-ink-soft">Lvl</div>
              <div className="text-xl font-black leading-none">{d.xp.level}</div>
            </ProgressRing>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Zap className="h-4 w-4 text-amber-500" /> {d.xp.total.toLocaleString()} XP
              </div>
              <div className="mt-0.5 text-xs text-ink-soft dark:text-zinc-500">
                {(d.xp.nextLevelXp - d.xp.total).toLocaleString()} XP to level {d.xp.level + 1}
              </div>
              {d.rewards.find((r) => !r.unlocked) && (
                <div className="mt-2 text-xs font-medium">
                  Next reward: {d.rewards.find((r) => !r.unlocked)!.emoji} {d.rewards.find((r) => !r.unlocked)!.title} ·{" "}
                  <span className="text-brand-600 dark:text-brand-300">{d.rewards.find((r) => !r.unlocked)!.progress}%</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <RecoveryCard recovery={d.recovery} onChanged={reload} />

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={minutesToLabel(d.totals.todayMinutes)}
          sub={d.today.target ? `${studyPct}% of today's ${minutesToLabel(d.today.target)} target` : "Rest day — recharge 🌿"}
          icon={<Clock className="h-5 w-5" />}
          gradient="from-rose-500 to-pink-500"
          progress={studyPct}
        />
        <StatCard
          label="This week"
          value={minutesToLabel(d.totals.weekMinutes)}
          sub={`Target ${minutesToLabel(d.totals.weekTarget)}`}
          icon={<CalendarDays className="h-5 w-5" />}
          gradient="from-violet-500 to-indigo-500"
          progress={pct(d.totals.weekMinutes, d.totals.weekTarget)}
          delay={60}
        />
        <StatCard
          label="Week tasks done"
          value={`${d.completion.weekTasks}%`}
          sub={`Today: ${d.completion.todayTasks}% complete`}
          icon={<ListChecks className="h-5 w-5" />}
          gradient="from-emerald-500 to-teal-500"
          progress={d.completion.weekTasks}
          delay={120}
        />
        <StatCard
          label="Skills gained"
          value={`${d.skills.gained} / ${d.skills.total}`}
          sub={`Avg level ${d.skills.avgLevel}% · ${d.skills.checklistDone}/${d.skills.checklistTotal} topics`}
          icon={<Brain className="h-5 w-5" />}
          gradient="from-sky-500 to-blue-600"
          progress={pct(d.skills.checklistDone, d.skills.checklistTotal)}
          delay={180}
        />
      </div>

      {/* ---------- Charts + plan ---------- */}
      <div className="grid gap-5 lg:grid-cols-3">
        <ProgressCharts charts={d.charts} />
        <Card style={{ animationDelay: "160ms" }}>
          <CardTitle icon={<Rocket className="h-4 w-4" />} title={`${d.plan.weeks}-week plan`} subtitle={d.settings.mainGoal} />
          <div className="flex flex-col items-center">
            <ProgressRing value={d.plan.pct} size={150} stroke={14} colorTo="rgb(var(--brand-alt))">
              <div className="text-3xl font-black">{d.plan.started ? `W${d.plan.week}` : "—"}</div>
              <div className="text-xs text-ink-soft">{d.plan.pct}% of plan</div>
            </ProgressRing>
            <div className="mt-5 grid w-full grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/5">
                <div className="text-lg font-bold">{Math.round(d.plan.actualMinutes / 60)}h</div>
                <div className="text-[11px] text-ink-soft">studied in plan</div>
              </div>
              <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/5">
                <div className="text-lg font-bold">{d.plan.daysLeft}</div>
                <div className="text-[11px] text-ink-soft">days left</div>
              </div>
            </div>
            {d.plan.expectedMinutes > 0 && (
              <div className="mt-4 w-full">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-ink-soft">On-pace score</span>
                  <span className="font-semibold">{pct(d.plan.actualMinutes, d.plan.expectedMinutes)}%</span>
                </div>
                <ProgressBar value={pct(d.plan.actualMinutes, d.plan.expectedMinutes)} />
                <p className="mt-2 text-[11px] text-ink-soft dark:text-zinc-500">
                  {d.plan.actualMinutes >= d.plan.expectedMinutes
                    ? "Ahead of schedule — beautiful work."
                    : `${minutesToLabel(d.plan.expectedMinutes - d.plan.actualMinutes)} behind pace. Small extra blocks close it fast.`}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ---------- Heatmap + goals ---------- */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={<Flame className="h-4 w-4" />} title="Consistency" subtitle="Each square is a day — darker means closer to your target" />
          <Heatmap data={d.charts.heatmap} />
          {d.charts.topics.length > 0 && (
            <div className="mt-5">
              <div className="label">Where your time went (30 days)</div>
              <div className="flex flex-wrap gap-2">
                {d.charts.topics.map((t) => (
                  <span key={t.name} className="chip bg-black/5 py-1 dark:bg-white/10">
                    {t.name} · <b>{minutesToLabel(t.minutes)}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card>
          <CardTitle icon={<Target className="h-4 w-4" />} title="Goal completion" action={<Link href="/goals" className="text-xs font-semibold text-brand-600 dark:text-brand-300">View</Link>} />
          <div className="space-y-4">
            {d.completion.goals.map((g) => (
              <div key={g.timeframe}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium capitalize">{g.timeframe.toLowerCase()}</span>
                  <span className="text-ink-soft">
                    {g.done}/{g.total} · <b className="text-ink dark:text-white">{g.pct}%</b>
                  </span>
                </div>
                <ProgressBar value={g.pct} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ---------- Tasks, DSA, Skills ---------- */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardTitle icon={<ListChecks className="h-4 w-4" />} title="Up next" action={<Link href="/goals" className="text-xs font-semibold text-brand-600 dark:text-brand-300">All tasks</Link>} />
          {d.upcomingTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">No open tasks. Plan tomorrow&apos;s top 3! ✍️</p>
          ) : (
            <ul className="space-y-1">
              {d.upcomingTasks.map((t) => {
                const overdue = t.deadline && parseISO(t.deadline) < new Date(new Date().setHours(0, 0, 0, 0));
                return (
                  <li key={t.id} className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-black/[0.03] dark:hover:bg-white/5">
                    <button onClick={() => toggleTask(t)} className="mt-0.5 text-zinc-400 transition hover:scale-110 hover:text-emerald-500" aria-label="Complete task">
                      {t.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft">
                        <PriorityBadge priority={t.priority} />
                        {t.deadline && (
                          <span className={cn(overdue && "font-semibold text-rose-500")}>
                            {overdue ? "Overdue · " : ""}
                            {format(parseISO(t.deadline), "MMM d")}
                          </span>
                        )}
                        <span>· {minutesToLabel(t.estimatedMinutes)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle icon={<Code2 className="h-4 w-4" />} title="DSA progress" action={<Link href="/dsa" className="text-xs font-semibold text-brand-600 dark:text-brand-300">Open</Link>} />
          <div className="flex items-center gap-5">
            <ProgressRing value={100} size={110} stroke={10} color="#0a84ff" colorTo="#40e0ff">
              <div className="text-3xl font-black">{d.dsa.total}</div>
              <div className="text-[11px] text-ink-soft">solved</div>
            </ProgressRing>
            <div className="flex-1 space-y-2.5">
              {[
                { label: "Easy", v: d.dsa.easy, c: "#30d158" },
                { label: "Medium", v: d.dsa.medium, c: "#ff9f0a" },
                { label: "Hard", v: d.dsa.hard, c: "#ff375f" },
              ].map((x) => (
                <div key={x.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{x.label}</span>
                    <b>{x.v}</b>
                  </div>
                  <ProgressBar value={pct(x.v, d.dsa.total)} color={x.c} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/dsa?due=1" className="rounded-2xl bg-amber-500/10 p-3 transition hover:bg-amber-500/20">
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{d.dsa.dueRevision}</div>
              <div className="text-[11px] font-medium text-ink-soft">due for revision →</div>
            </Link>
            <div className="rounded-2xl bg-sky-500/10 p-3">
              <div className="text-xl font-bold text-sky-600 dark:text-sky-400">{d.dsa.thisWeek}</div>
              <div className="text-[11px] font-medium text-ink-soft">solved this week</div>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle icon={<BookOpenCheck className="h-4 w-4" />} title="Skill levels" action={<Link href="/skills" className="text-xs font-semibold text-brand-600 dark:text-brand-300">Open</Link>} />
          {d.skills.top.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">Add skills to track your growth.</p>
          ) : (
            <div className="space-y-3">
              {d.skills.top.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-ink-soft">{s.level}%</span>
                  </div>
                  <ProgressBar value={s.level} color={SKILL_COLOR_HEX[s.color]} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ---------- Rewards + achievements ---------- */}
      {d.rewards.length > 0 && (
        <div className={cn("grid gap-4 md:grid-cols-2", d.rewards.length >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
          {d.rewards.slice(0, 4).map((r, i) => (
            <RewardCard key={r.id} reward={r} index={i} />
          ))}
        </div>
      )}

      <Card>
        <CardTitle
          icon={<Trophy className="h-4 w-4" />}
          title="Achievements"
          subtitle={`${unlocked.length} of ${d.achievements.length} unlocked`}
          action={
            <Link href="/rewards" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {[...unlocked.slice(-4).reverse(), ...nextAchievements.slice(0, 8 - Math.min(4, unlocked.length))].map((a) => (
            <AchievementBadge key={a.id} a={a} compact />
          ))}
        </div>
      </Card>
    </div>
  );
}

function RingLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        <span className="h-2 w-2 rounded-full" style={{ background: color }} /> {label}
      </div>
      <div className="font-semibold text-white">{value}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-[2rem] lg:col-span-2" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}
