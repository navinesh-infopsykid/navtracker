"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import {
  ArrowDownToLine,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Minus,
  Plus,
  Rocket,
  Settings2,
  Target,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, PriorityBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar, ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/components/layout/SettingsProvider";
import { api, ApiClientError, cn, useFetch } from "@/lib/client";
import { WEEKDAYS } from "@/lib/constants";
import { minutesToLabel, toDateInput } from "@/lib/dates";
import { dayTargetsOf } from "@/lib/targets";
import type { SettingsDTO, TaskDTO, WeekDTO } from "@/lib/types";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function WeekPage() {
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload, hardReload } = useFetch<WeekDTO>(`/api/week?offset=${offset}`);
  const [completing, setCompleting] = useState<TaskDTO | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const { toast, celebrate } = useToast();
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const todayKey = toDateInput(new Date());

  // ---- task actions ----
  const patch = async (t: TaskDTO, body: Record<string, unknown>, msg?: string) => {
    try {
      await api(`/api/tasks/${t.id}`, { method: "PATCH", body });
      if (msg) toast(msg);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const toggle = (t: TaskDTO) => {
    if (t.completed) patch(t, { completed: false }, "Marked as not done");
    else setCompleting(t);
  };

  // where "pull in" / "do today" puts a task
  const pullTarget = useMemo(() => {
    if (!data) return todayKey;
    const start = toDateInput(data.start);
    const end = toDateInput(data.end);
    return todayKey >= start && todayKey <= end ? todayKey : start;
  }, [data, todayKey]);

  const moveTo = (t: TaskDTO, date: string, msg: string) => patch(t, { deadline: date }, msg);
  const pushNextWeek = (t: TaskDTO) => {
    const base = t.deadline ? parseISO(t.deadline) : new Date();
    moveTo(t, toDateInput(addDays(base, 7)), "Moved to next week — no guilt, just a better plan");
  };

  if (loading && !data) return <WeekSkeleton />;
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={hardReload} />;

  const { stats } = data;
  const allDone = stats.total > 0 && stats.done === stats.total && data.carryOver.length === 0;
  const free = stats.capacityLeft - stats.plannedLeft;
  const capacity =
    stats.plannedLeft === 0
      ? "clear"
      : free >= 45
        ? "room"
        : free >= -30
          ? "balanced"
          : "overloaded";

  const byDay = (date: string) => data.tasks.filter((t) => t.deadline && toDateInput(t.deadline) === date);
  const weekLabel = data.week >= 1 && data.week <= data.weeks ? `Week ${data.week} of ${data.weeks}` : data.week < 1 ? "Before the plan" : `Week ${data.week}`;

  return (
    <div className="space-y-5">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-4 animate-fade-up sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
            <Rocket className="h-3.5 w-3.5" /> {weekLabel} · {format(parseISO(data.start), "d MMM")} – {format(parseISO(data.end), "d MMM")}
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">🗓️ {data.isCurrent ? "This Week" : offset < 0 ? "Past week" : "Upcoming week"}</h1>
          {data.goal && (
            <p className="mt-1 text-sm text-ink-soft dark:text-zinc-400 sm:text-base">
              <span className="font-semibold text-ink dark:text-zinc-100">{data.goal.title}</span>
              {data.goal.description ? ` — ${data.goal.description}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          {offset !== 0 && (
            <Button variant="soft" size="md" onClick={() => setOffset(0)}>
              This week
            </Button>
          )}
          <Button variant="secondary" size="icon" onClick={() => setOffset((o) => o + 1)} aria-label="Next week">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ---------- Weekly target, tasks, capacity ---------- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex items-center gap-4">
          <ProgressRing value={pct(stats.studied, stats.weekTarget)} size={96} stroke={10} color="#ff2d55" colorTo="#ff6482">
            <span className="text-lg font-black">{pct(stats.studied, stats.weekTarget)}%</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Weekly target</div>
            <div className="mt-0.5 text-xl font-bold tracking-tight">
              {minutesToLabel(stats.studied)} <span className="text-sm font-medium text-ink-soft">/ {minutesToLabel(stats.weekTarget)}</span>
            </div>
            <button onClick={() => setAdjusting(true)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              <Settings2 className="h-3.5 w-3.5" /> Adjust daily hours
            </button>
          </div>
        </Card>

        <Card className="flex items-center gap-4" style={{ animationDelay: "60ms" }}>
          <ProgressRing value={pct(stats.done, stats.total)} size={96} stroke={10} color="#30d158" colorTo="#a6ff00">
            <span className="text-lg font-black">
              {stats.done}/{stats.total}
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Tasks this week</div>
            <div className="mt-0.5 text-xl font-bold tracking-tight">{pct(stats.done, stats.total)}% done</div>
            <div className="mt-1 text-xs text-ink-soft">
              {minutesToLabel(stats.doneMinutes)} of {minutesToLabel(stats.plannedMinutes)} planned work
            </div>
          </div>
        </Card>

        <Card
          style={{ animationDelay: "120ms" }}
          className={cn(
            capacity === "overloaded" && "border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10",
            (capacity === "room" || capacity === "clear") && data.isCurrent && "border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10",
          )}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Time left vs. work left</div>
          <div className="mt-1 text-xl font-bold tracking-tight">
            {minutesToLabel(stats.capacityLeft)} <span className="text-sm font-medium text-ink-soft">free · {minutesToLabel(stats.plannedLeft)} planned</span>
          </div>
          <ProgressBar
            className="mt-2"
            value={stats.capacityLeft ? (stats.plannedLeft / stats.capacityLeft) * 100 : stats.plannedLeft ? 100 : 0}
            color={capacity === "overloaded" ? "#f59e0b" : "#30d158"}
          />
          <p className="mt-2 text-xs leading-relaxed text-ink-soft dark:text-zinc-400">
            {capacity === "clear"
              ? "Everything planned is done. Pull the next tasks in below 🚀"
              : capacity === "room"
                ? `About ${minutesToLabel(free)} of spare time — you can pull work in from next week.`
                : capacity === "balanced"
                  ? "Planned work fits the time you have. Stay steady."
                  : `About ${minutesToLabel(-free)} more work than time. Push a low-priority task to next week.`}
          </p>
        </Card>
      </div>

      {allDone && data.isCurrent && (
        <div className="flex flex-col gap-3 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white shadow-lg animate-fade-up sm:flex-row sm:items-center">
          <div className="text-4xl">🏁</div>
          <div className="flex-1">
            <div className="text-lg font-bold">Week complete — you finished early!</div>
            <div className="text-sm text-white/85">Rest is earned. Or keep the momentum: pull a few tasks from next week below.</div>
          </div>
        </div>
      )}

      {/* ---------- Day strip ---------- */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
        {data.days.map((d) => {
          const dayTasks = byDay(d.date);
          const done = dayTasks.filter((t) => t.completed).length;
          return (
            <button
              key={d.date}
              onClick={() => dayRefs.current[d.date]?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className={cn(
                "min-w-[84px] rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5",
                d.isToday ? "border-brand-500 bg-brand-500/10" : "border-black/5 bg-white/70 dark:border-white/10 dark:bg-zinc-900/60",
                d.isPast && !d.isToday && "opacity-70",
              )}
            >
              <div className="text-[11px] font-bold uppercase text-ink-soft">{format(parseISO(d.date), "EEE")}</div>
              <div className="text-lg font-black leading-tight">{format(parseISO(d.date), "d")}</div>
              <div className="mt-1 text-[10px] text-ink-soft">{d.target ? `${minutesToLabel(d.studied)}/${minutesToLabel(d.target)}` : "Rest"}</div>
              <ProgressBar className="mt-1 h-1" value={d.target ? pct(d.studied, d.target) : 0} />
              <div className="mt-1 text-[10px] font-semibold">{dayTasks.length ? `${done}/${dayTasks.length} tasks` : "—"}</div>
            </button>
          );
        })}
      </div>

      {/* ---------- Quick add ---------- */}
      <QuickAdd days={data.days.map((d) => d.date)} defaultDay={pullTarget} goalId={data.goal?.id ?? null} onAdded={reload} />

      {/* ---------- Carry-over ---------- */}
      {data.carryOver.length > 0 && (
        <Card className="border-amber-500/30">
          <CardTitle icon={<Undo2 className="h-4 w-4" />} title={`Carried over (${data.carryOver.length})`} subtitle="Unfinished from earlier weeks — do it now or give it a new home" />
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {data.carryOver.map((t) => (
              <TaskRow
                key={t.id}
                t={t}
                weekDays={data.days.map((d) => d.date)}
                onToggle={() => toggle(t)}
                onMove={(date) => moveTo(t, date, `Moved to ${format(parseISO(date), "EEE d MMM")}`)}
                onPush={() => pushNextWeek(t)}
                onEstimate={(m) => patch(t, { estimatedMinutes: m })}
                extra={
                  <Button size="sm" variant="soft" onClick={() => moveTo(t, pullTarget, "Added to today 💪")}>
                    Do today
                  </Button>
                }
              />
            ))}
          </ul>
        </Card>
      )}

      {/* ---------- Days ---------- */}
      {stats.total === 0 && data.carryOver.length === 0 ? (
        <EmptyState emoji="🗓️" title="Nothing planned this week" description="Add a task above, or pull tasks in from later in the plan." />
      ) : (
        <div className="space-y-4">
          {data.days.map((d) => {
            const dayTasks = byDay(d.date);
            const minutes = dayTasks.filter((t) => !t.completed).reduce((a, t) => a + t.estimatedMinutes, 0);
            return (
              <div key={d.date} ref={(el) => { dayRefs.current[d.date] = el; }} className="scroll-mt-24">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
                  <h2 className={cn("text-lg font-bold tracking-tight", d.isToday && "text-brand-600 dark:text-brand-300")}>
                    {format(parseISO(d.date), "EEEE, d MMM")}
                    {d.isToday && <span className="ml-2 chip bg-brand-500 text-white">Today</span>}
                  </h2>
                  <span className="text-xs text-ink-soft">
                    {d.target ? `Target ${minutesToLabel(d.target)} · studied ${minutesToLabel(d.studied)}` : "Rest day 🌿"}
                    {minutes > 0 && ` · ${minutesToLabel(minutes)} of tasks left`}
                  </span>
                </div>
                {dayTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm text-ink-soft dark:border-white/10">
                    {d.target ? "Nothing planned — a good slot to pull work in." : "Rest. Recharge. 🌿"}
                  </div>
                ) : (
                  <Card className="p-2 sm:p-3">
                    <ul className="divide-y divide-black/5 dark:divide-white/5">
                      {dayTasks.map((t) => (
                        <TaskRow
                          key={t.id}
                          t={t}
                          weekDays={data.days.map((x) => x.date)}
                          onToggle={() => toggle(t)}
                          onMove={(date) => moveTo(t, date, `Moved to ${format(parseISO(date), "EEE d MMM")}`)}
                          onPush={() => pushNextWeek(t)}
                          onEstimate={(m) => patch(t, { estimatedMinutes: m })}
                        />
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Pull ahead ---------- */}
      <Card className={cn((capacity === "room" || allDone) && data.isCurrent && "ring-2 ring-emerald-500/40")}>
        <CardTitle
          icon={<ArrowDownToLine className="h-4 w-4" />}
          title="Ahead in the plan"
          subtitle={
            capacity === "room" || allDone
              ? "You have spare time — pull the next tasks into this week"
              : "Finished early? Pull the next tasks into this week"
          }
        />
        {data.ahead.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-soft">Nothing left ahead — you&apos;re at the end of the plan. 🎉</p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {data.ahead.map((t) => {
              const planStart = parseISO(data.settings.planStartDate);
              const wk = t.deadline ? Math.floor((parseISO(t.deadline).getTime() - planStart.getTime()) / (7 * 864e5)) + 1 : null;
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug">{t.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft">
                      {wk && <Badge className="bg-brand-500/10 text-brand-700 dark:text-brand-300">Week {wk}</Badge>}
                      <PriorityBadge priority={t.priority} />
                      <span>{minutesToLabel(t.estimatedMinutes)}</span>
                      {t.deadline && <span>· planned {format(parseISO(t.deadline), "EEE d MMM")}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="soft" onClick={() => moveTo(t, pullTarget, "Pulled into this week — love the momentum 🚀")}>
                    <Plus className="h-3.5 w-3.5" /> Pull in
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 text-xs text-ink-soft">
          See every task in <Link href="/goals" className="font-semibold text-brand-600 dark:text-brand-300">Goals & Tasks</Link>.
        </div>
      </Card>

      {completing && (
        <CompleteModal
          task={completing}
          onClose={() => setCompleting(null)}
          onDone={(logged, minutes) => {
            setCompleting(null);
            celebrate(logged ? `Done! +${minutesToLabel(minutes)} toward your weekly target 🎯` : "Done! +10 XP ✨");
            reload();
          }}
        />
      )}
      {adjusting && (
        <AdjustTargets
          settings={data.settings}
          onClose={() => setAdjusting(false)}
          onSaved={() => {
            setAdjusting(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

// ---------- Task row with quick time + day controls ----------

function TaskRow({
  t,
  weekDays,
  onToggle,
  onMove,
  onPush,
  onEstimate,
  extra,
}: {
  t: TaskDTO;
  weekDays: string[];
  onToggle: () => void;
  onMove: (date: string) => void;
  onPush: () => void;
  onEstimate: (m: number) => void;
  extra?: React.ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const [editTime, setEditTime] = useState(false);
  const [est, setEst] = useState(t.estimatedMinutes);
  const current = t.deadline ? toDateInput(t.deadline) : "";

  useEffect(() => setEst(t.estimatedMinutes), [t.estimatedMinutes]);

  const saveEst = (v: number) => {
    const clamped = Math.min(720, Math.max(5, v));
    setEst(clamped);
    if (clamped !== t.estimatedMinutes) onEstimate(clamped);
  };

  return (
    <li className="flex items-start gap-3 px-1 py-3 sm:px-2">
      <button onClick={onToggle} className="mt-0.5 shrink-0 transition hover:scale-110" aria-label={t.completed ? "Mark not done" : "Complete task"}>
        {t.completed ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Circle className="h-6 w-6 text-zinc-300 hover:text-emerald-500 dark:text-zinc-600" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn("text-[15px] font-medium leading-snug", t.completed && "text-ink-soft line-through")}>{t.title}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          <PriorityBadge priority={t.priority} />
          {t.completed ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <Clock className="h-3 w-3" /> took {minutesToLabel(t.actualMinutes ?? t.estimatedMinutes)}
            </Badge>
          ) : editTime ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-1 py-0.5">
              <button className="rounded-full p-1 hover:bg-brand-500/20" onClick={() => saveEst(est - 15)} aria-label="Less time">
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[48px] text-center font-semibold text-brand-700 dark:text-brand-300">{minutesToLabel(est)}</span>
              <button className="rounded-full p-1 hover:bg-brand-500/20" onClick={() => saveEst(est + 15)} aria-label="More time">
                <Plus className="h-3 w-3" />
              </button>
              <button className="px-1.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300" onClick={() => setEditTime(false)}>
                Done
              </button>
            </span>
          ) : (
            <button onClick={() => setEditTime(true)} className="chip bg-black/5 hover:bg-brand-500/15 dark:bg-white/10" title="Adjust time">
              <Clock className="h-3 w-3" /> {minutesToLabel(t.estimatedMinutes)}
            </button>
          )}
          {t.goal && <span className="truncate">· {t.goal.title}</span>}
        </div>
        {t.notes && !t.completed && <p className="mt-1 line-clamp-2 text-xs text-ink-soft dark:text-zinc-500">{t.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {extra}
        {!t.completed && (
          <div>
            <Button size="icon" variant="ghost" onClick={() => setMenu(!menu)} aria-label="Move task">
              <CalendarClock className="h-4 w-4" />
            </Button>
            <Modal open={menu} onClose={() => setMenu(false)} title="Move task" size="sm">
              <p className="mb-3 text-sm font-medium">{t.title}</p>
              <div className="grid grid-cols-2 gap-2">
                {weekDays.map((d) => (
                  <button
                    key={d}
                    disabled={d === current}
                    onClick={() => {
                      setMenu(false);
                      onMove(d);
                    }}
                    className="flex flex-col items-start rounded-2xl bg-black/[0.04] px-3 py-2.5 text-left transition hover:bg-brand-500/15 disabled:opacity-40 dark:bg-white/5"
                  >
                    <span className="text-sm font-semibold">{format(parseISO(d), "EEEE")}</span>
                    <span className="text-xs text-ink-soft">{d === current ? "current day" : format(parseISO(d), "d MMM")}</span>
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                className="mt-3 w-full border-amber-500/30 text-amber-600 dark:text-amber-400"
                onClick={() => {
                  setMenu(false);
                  onPush();
                }}
              >
                Push to next week →
              </Button>
              <label className="mt-3 block text-sm">
                <span className="label">Or pick any date</span>
                <input
                  type="date"
                  className="input"
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setMenu(false);
                    onMove(e.target.value);
                  }}
                />
              </label>
            </Modal>
          </div>
        )}
      </div>
    </li>
  );
}

// ---------- Complete with the time it took ----------

function CompleteModal({ task, onClose, onDone }: { task: TaskDTO; onClose: () => void; onDone: (logged: boolean, minutes: number) => void }) {
  const [minutes, setMinutes] = useState(String(task.estimatedMinutes));
  const [log, setLog] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const submit = async (withTime: boolean) => {
    const m = Number(minutes);
    if (withTime && (!m || m < 1 || m > 720)) return setError("Enter 1–720 minutes");
    setSaving(true);
    try {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: withTime ? { completed: true, actualMinutes: m, logSession: log } : { completed: true },
      });
      onDone(withTime && log, m);
    } catch (e) {
      if (e instanceof ApiClientError && e.fields.actualMinutes) setError(e.fields.actualMinutes);
      toast(e instanceof Error ? e.message : "Couldn't complete", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      title="Nice work! ✅"
      footer={
        <>
          <Button variant="ghost" onClick={() => submit(false)} disabled={saving}>
            Skip time
          </Button>
          <Button onClick={() => submit(true)} loading={saving}>
            Complete
          </Button>
        </>
      }
    >
      <p className="text-sm font-medium">{task.title}</p>
      <div className="mt-4">
        <label className="label" htmlFor="actual">How long did it take? (minutes)</label>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => setMinutes(String(Math.max(5, (Number(minutes) || 0) - 15)))} aria-label="Less">
            <Minus className="h-4 w-4" />
          </Button>
          <input
            id="actual"
            type="number"
            inputMode="numeric"
            min={1}
            max={720}
            value={minutes}
            onChange={(e) => {
              setMinutes(e.target.value);
              setError("");
            }}
            className={cn("input text-center text-lg font-bold", error && "border-rose-400")}
          />
          <Button variant="secondary" size="icon" onClick={() => setMinutes(String(Math.min(720, (Number(minutes) || 0) + 15)))} aria-label="More">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}
        <p className="mt-1.5 text-xs text-ink-soft">
          Estimated {minutesToLabel(task.estimatedMinutes)}
          {Number(minutes) > 0 && ` · you entered ${minutesToLabel(Number(minutes))}`}
        </p>
      </div>
      <label className="mt-4 flex items-start gap-2.5 rounded-2xl bg-black/[0.03] p-3 text-sm dark:bg-white/5">
        <input type="checkbox" checked={log} onChange={(e) => setLog(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand-500))]" />
        <span>
          <b>Add to today&apos;s study time</b>
          <span className="block text-xs text-ink-soft">Counts toward your daily and weekly target. Turn off if you already logged it with the focus timer.</span>
        </span>
      </label>
    </Modal>
  );
}

// ---------- Adjust daily hours (weekly target) ----------

function AdjustTargets({ settings, onClose, onSaved }: { settings: SettingsDTO; onClose: () => void; onSaved: () => void }) {
  const { setSettings } = useSettings();
  const { toast } = useToast();
  const [targets, setTargets] = useState(dayTargetsOf(settings).map(String));
  const [saving, setSaving] = useState(false);
  const total = targets.reduce((a, v) => a + (Number(v) || 0), 0);

  const save = async () => {
    const dayTargets = targets.map((v) => Math.max(0, Number(v) || 0));
    if (!dayTargets.some((m) => m > 0)) return toast("At least one day needs a target", "error");
    setSaving(true);
    try {
      const saved = await api<SettingsDTO>("/api/settings", {
        method: "PUT",
        body: {
          name: settings.name,
          mainGoal: settings.mainGoal,
          dayTargets,
          dailyLimitMinutes: Math.max(settings.dailyLimitMinutes, ...dayTargets),
          streakMinMinutes: settings.streakMinMinutes,
          dailyDsaTarget: settings.dailyDsaTarget,
          planStartDate: toDateInput(settings.planStartDate),
          planWeeks: settings.planWeeks,
          theme: settings.theme,
          accent: settings.accent,
        },
      });
      setSettings(saved);
      toast(`Weekly target is now ${minutesToLabel(total)}`);
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Adjust daily hours"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save · {minutesToLabel(total)}/week</Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-ink-soft dark:text-zinc-400">Minutes per day. 0 = rest day (never breaks your streak). The plan suggests 3.5 h on weekdays, a light Friday and 6–7 h on weekends.</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <div key={d} className={cn("rounded-2xl p-2 text-center", Number(targets[d]) > 0 ? "bg-brand-500/10" : "bg-black/[0.04] dark:bg-white/5")}>
            <div className="text-xs font-bold">{WEEKDAYS[d]}</div>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={960}
              step={15}
              value={targets[d]}
              onChange={(e) => setTargets(targets.map((v, i) => (i === d ? e.target.value : v)))}
              className="input mt-1 px-1 text-center"
              aria-label={`${WEEKDAYS[d]} minutes`}
            />
            <div className="mt-1 text-[10px] text-ink-soft">{Number(targets[d]) ? minutesToLabel(Number(targets[d])) : "Rest"}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["Plan default", [390, 210, 210, 210, 210, 60, 390]],
          ["Lighter week", [300, 150, 150, 150, 150, 0, 300]],
          ["Push week", [420, 240, 240, 240, 240, 120, 420]],
        ].map(([label, preset]) => (
          <button key={label as string} onClick={() => setTargets((preset as number[]).map(String))} className="chip bg-black/5 py-1.5 hover:bg-brand-500/15 dark:bg-white/10">
            {label as string}
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ---------- Quick add ----------

function QuickAdd({ days, defaultDay, goalId, onAdded }: { days: string[]; defaultDay: string; goalId: number | null; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [mins, setMins] = useState("45");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  useEffect(() => setDay(defaultDay), [defaultDay]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api("/api/tasks", { method: "POST", body: { title, estimatedMinutes: Number(mins) || 30, deadline: day, priority: "MEDIUM", goalId } });
      setTitle("");
      toast("Task added ✅");
      onAdded();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't add", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={add} className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-2">
        <Target className="ml-1 hidden h-4 w-4 shrink-0 text-brand-500 sm:block" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task to this week…" className="input border-0 bg-transparent px-1 shadow-none focus:ring-0 dark:bg-transparent" maxLength={160} />
      </div>
      <div className="flex gap-2">
        <select value={day} onChange={(e) => setDay(e.target.value)} className="input w-auto flex-1 py-2 text-xs sm:flex-none" aria-label="Day">
          {days.map((d) => (
            <option key={d} value={d}>{format(parseISO(d), "EEE d")}</option>
          ))}
        </select>
        <select value={mins} onChange={(e) => setMins(e.target.value)} className="input w-auto py-2 text-xs" aria-label="Estimate">
          {[15, 30, 45, 60, 75, 90, 120, 180, 240].map((m) => (
            <option key={m} value={m}>{minutesToLabel(m)}</option>
          ))}
        </select>
        <Button type="submit" loading={saving} disabled={!title.trim()} size="md">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </form>
  );
}

function WeekSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-20 w-2/3" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </div>
  );
}
