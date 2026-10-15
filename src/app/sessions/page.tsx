"use client";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { AlertTriangle, Pause, Pencil, Play, Square, Star, Timer, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, SkillDot } from "@/components/ui/Badge";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar, ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/components/layout/SettingsProvider";
import { api, ApiClientError, cn, useFetch } from "@/lib/client";
import { dayKey, minutesToLabel, toDateInput } from "@/lib/dates";
import { targetFor } from "@/lib/targets";
import type { SessionDTO, SkillDTO } from "@/lib/types";

const TIMER_KEY = "nav-focus-timer";
interface TimerState {
  startedAt: number | null; // epoch ms when running
  accumulated: number; // ms
  topic: string;
}

export default function SessionsPage() {
  const from = toDateInput(subDays(new Date(), 60));
  const sessions = useFetch<SessionDTO[]>(`/api/sessions?from=${from}&limit=500`);
  const skills = useFetch<SkillDTO[]>("/api/skills");
  const { settings } = useSettings();
  const [editing, setEditing] = useState<SessionDTO | null>(null);
  const [prefill, setPrefill] = useState<{ minutes: number; topic: string } | null>(null);
  const { toast, confirm } = useToast();

  const target = settings ? targetFor(settings, new Date()) : 240;
  const limit = settings?.dailyLimitMinutes ?? 480;
  const todayMinutes = (sessions.data ?? []).filter((s) => dayKey(s.date) === dayKey(new Date())).reduce((a, s) => a + s.minutes, 0);

  const grouped = useMemo(() => {
    const map = new Map<string, SessionDTO[]>();
    for (const s of sessions.data ?? []) {
      const k = dayKey(s.date);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return Array.from(map.entries());
  }, [sessions.data]);

  const remove = async (s: SessionDTO) => {
    if (!(await confirm({ title: "Delete session?", message: `${minutesToLabel(s.minutes)} of "${s.topic}" will be removed.`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await api(`/api/sessions/${s.id}`, { method: "DELETE" });
      toast("Session deleted");
      sessions.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  return (
    <div>
      <PageHeader emoji="⏱️" title="Study Sessions" subtitle="Log real focused time. What gets measured gets improved." />

      <div className="grid gap-5 lg:grid-cols-3">
        <FocusTimer onStop={(minutes, topic) => setPrefill({ minutes, topic })} />

        <Card style={{ animationDelay: "60ms" }}>
          <CardTitle icon={<Timer className="h-4 w-4" />} title="Today" subtitle={target ? `Today's target ${minutesToLabel(target)} · Limit ${minutesToLabel(limit)}` : `Rest day · Limit ${minutesToLabel(limit)}`} />
          <div className="flex items-center gap-5">
            <ProgressRing value={target ? (todayMinutes / target) * 100 : 100} size={120} stroke={12} color="#ff2d55" colorTo="#ff6482">
              <div className="text-2xl font-black">{minutesToLabel(todayMinutes)}</div>
              <div className="text-[11px] text-ink-soft">{target ? `${Math.round((todayMinutes / target) * 100)}%` : "rest day"}</div>
            </ProgressRing>
            <div className="flex-1 text-sm">
              {todayMinutes >= limit ? (
                <p className="font-medium text-amber-600 dark:text-amber-400">You&apos;ve hit your daily limit. Rest is part of the plan — your brain consolidates while you recover. 🌙</p>
              ) : todayMinutes >= target ? (
                <p className="font-medium text-emerald-600 dark:text-emerald-400">Target reached! 🎉 Anything extra is a bonus.</p>
              ) : (
                <p className="text-ink-soft dark:text-zinc-400">
                  <b className="text-ink dark:text-white">{minutesToLabel(target - todayMinutes)}</b> left to hit today&apos;s target. One focused block at a time.
                </p>
              )}
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-ink-soft">
                  <span>Daily limit</span>
                  <span>{Math.round((todayMinutes / limit) * 100)}%</span>
                </div>
                <ProgressBar value={(todayMinutes / limit) * 100} color={todayMinutes > limit ? "#f59e0b" : "#a1a1aa"} />
              </div>
            </div>
          </div>
        </Card>

        <SessionForm
          key={prefill ? `${prefill.minutes}-${prefill.topic}` : "blank"}
          prefill={prefill}
          skills={skills.data ?? []}
          onSaved={() => {
            setPrefill(null);
            sessions.reload();
          }}
        />
      </div>

      <h2 className="mb-3 mt-8 text-xl font-bold tracking-tight">History</h2>
      {sessions.loading && !sessions.data ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : sessions.error ? (
        <ErrorState message={sessions.error} onRetry={sessions.hardReload} />
      ) : !grouped.length ? (
        <EmptyState emoji="⏳" title="No sessions yet" description="Start the focus timer or log your first session above. Every minute counts." />
      ) : (
        <div className="space-y-3">
          {grouped.map(([day, list], i) => {
            const total = list.reduce((a, s) => a + s.minutes, 0);
            const dayT = settings ? targetFor(settings, parseISO(day)) : target;
            return (
              <Card key={day} className="p-4" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{format(parseISO(day), "EEEE, MMM d")}</div>
                    <div className="text-xs text-ink-soft">
                      {list.length} session{list.length > 1 ? "s" : ""} · {minutesToLabel(total)}
                    </div>
                  </div>
                  <div className="w-32 sm:w-48">
                    <ProgressBar value={dayT ? (total / dayT) * 100 : 100} color={total >= dayT ? "#30d158" : undefined} />
                  </div>
                </div>
                <ul className="divide-y divide-black/5 dark:divide-white/5">
                  {list.map((s) => (
                    <li key={s.id} className="group flex items-center gap-3 py-2.5">
                      <div className="w-14 shrink-0 text-sm font-bold tabular-nums">{minutesToLabel(s.minutes)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.topic}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          {s.skill && (
                            <Badge>
                              <SkillDot color={s.skill.color} /> {s.skill.name}
                            </Badge>
                          )}
                          <span className="inline-flex">
                            {Array.from({ length: 5 }).map((_, k) => (
                              <Star key={k} className={cn("h-3 w-3", k < s.focus ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-700")} />
                            ))}
                          </span>
                          {s.notes && <span className="truncate text-xs text-ink-soft">{s.notes}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(s)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(s)} aria-label="Delete" className="hover:text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title="Edit session">
          <SessionForm
            session={editing}
            skills={skills.data ?? []}
            embedded
            onSaved={() => {
              setEditing(null);
              sessions.reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

// ---------- Focus timer (persists across page reloads) ----------

function FocusTimer({ onStop }: { onStop: (minutes: number, topic: string) => void }) {
  const [state, setState] = useState<TimerState>({ startedAt: null, accumulated: 0, topic: "" });
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(state));
    } catch {}
  }, [state, loaded]);
  useEffect(() => {
    if (!state.startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state.startedAt]);

  const elapsed = state.accumulated + (state.startedAt ? now - state.startedAt : 0);
  const secs = Math.floor(elapsed / 1000);
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const running = !!state.startedAt;
  const pomodoro = ((secs % 1500) / 1500) * 100; // 25-minute cycles

  const start = () => setState((s) => ({ ...s, startedAt: Date.now() }));
  const pause = () => setState((s) => ({ ...s, startedAt: null, accumulated: s.accumulated + (s.startedAt ? Date.now() - s.startedAt : 0) }));
  const stop = () => {
    const minutes = Math.round(elapsed / 60000);
    setState({ startedAt: null, accumulated: 0, topic: "" });
    if (minutes < 1) return toast("Less than a minute — nothing to log yet", "info");
    onStop(minutes, state.topic);
    toast(`${minutesToLabel(minutes)} captured — review and save it in the log form`, "info");
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-zinc-950 p-6 text-white shadow-2xl animate-fade-up">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/40 blur-3xl" />
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/60">Focus timer</div>
        <div className="mt-4 flex items-center gap-5">
          <ProgressRing value={running || elapsed ? pomodoro : 0} size={96} stroke={8} track="rgba(255,255,255,0.1)" colorTo="rgb(var(--brand-alt))">
            <span className="text-[10px] uppercase text-white/60">25m</span>
          </ProgressRing>
          <div className="font-mono text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
            {hh}:{mm}
            <span className="text-white/40">:{ss}</span>
          </div>
        </div>
        <input
          value={state.topic}
          onChange={(e) => setState((s) => ({ ...s, topic: e.target.value }))}
          placeholder="What are you studying?"
          className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/30"
        />
        <div className="mt-4 flex gap-2">
          {running ? (
            <Button onClick={pause} variant="secondary" className="flex-1 border-white/10 bg-white/10 text-white hover:bg-white/20 dark:bg-white/10">
              <Pause className="h-4 w-4" /> Pause
            </Button>
          ) : (
            <Button onClick={start} className="flex-1">
              <Play className="h-4 w-4" /> {elapsed ? "Resume" : "Start focus"}
            </Button>
          )}
          <Button onClick={stop} variant="secondary" disabled={!elapsed} className="border-white/10 bg-white/10 text-white hover:bg-white/20 dark:bg-white/10">
            <Square className="h-4 w-4" /> Stop & log
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-white/50">Keeps running even if you close the tab. The ring completes every 25 minutes — take a 5-minute break.</p>
      </div>
    </div>
  );
}

// ---------- Log / edit form ----------

function SessionForm({
  session,
  prefill,
  skills,
  onSaved,
  embedded,
}: {
  session?: SessionDTO;
  prefill?: { minutes: number; topic: string } | null;
  skills: SkillDTO[];
  onSaved: () => void;
  embedded?: boolean;
}) {
  const { toast, celebrate } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    date: toDateInput(session?.date ?? new Date()),
    minutes: String(session?.minutes ?? prefill?.minutes ?? 60),
    topic: session?.topic ?? prefill?.topic ?? "",
    skillId: String(session?.skillId ?? ""),
    focus: session?.focus ?? 4,
    notes: session?.notes ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.topic.trim()) local.topic = "What did you study?";
    const mins = Number(form.minutes);
    if (!mins || mins < 1) local.minutes = "Enter minutes studied";
    if (mins > 720) local.minutes = "Max 12 hours per session";
    if (form.date > toDateInput(new Date())) local.date = "Can't log future sessions";
    setErrors(local);
    if (Object.keys(local).length) return;

    setSaving(true);
    try {
      const body = { ...form, minutes: mins, skillId: form.skillId || null };
      if (session) {
        await api(`/api/sessions/${session.id}`, { method: "PUT", body });
        toast("Session updated");
      } else {
        const res = await api<{ dayTotal: number; reachedTarget: boolean; overLimit: boolean }>("/api/sessions", { method: "POST", body });
        if (res.overLimit) toast(`Logged! You're over your daily limit (${minutesToLabel(res.dayTotal)}). Please rest — burnout costs more than one day.`, "info");
        else if (res.reachedTarget) celebrate(`Daily target reached! ${minutesToLabel(res.dayTotal)} today 🔥`);
        else toast(`+${minutesToLabel(mins)} logged · ${minutesToLabel(res.dayTotal)} today`);
        setForm((f) => ({ ...f, topic: "", notes: "", minutes: "60" }));
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiClientError) setErrors(err.fields);
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <form onSubmit={submit} className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date" name="date" type="date" value={form.date} max={toDateInput(new Date())} onChange={set("date")} error={errors.date} />
        <Input label="Minutes" name="minutes" type="number" min={1} max={720} value={form.minutes} onChange={set("minutes")} error={errors.minutes} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[25, 50, 90, 120].map((m) => (
          <button key={m} type="button" onClick={() => setForm({ ...form, minutes: String(m) })} className="chip bg-black/5 hover:bg-brand-500/15 dark:bg-white/10">
            {m}m
          </button>
        ))}
      </div>
      <Input label="Topic" name="topic" value={form.topic} onChange={set("topic")} error={errors.topic} placeholder="e.g. React hooks, Graph BFS" />
      <Select
        label="Skill"
        name="skillId"
        value={form.skillId}
        onChange={set("skillId")}
        options={[{ value: "", label: "— None —" }, ...skills.map((s) => ({ value: String(s.id), label: s.name }))]}
      />
      <div>
        <div className="label">Focus quality</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setForm({ ...form, focus: n })} aria-label={`Focus ${n}`}>
              <Star className={cn("h-6 w-6 transition hover:scale-110", n <= form.focus ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-700")} />
            </button>
          ))}
        </div>
      </div>
      <Textarea label="Notes" name="notes" value={form.notes} onChange={set("notes")} className="[&_textarea]:min-h-[60px]" placeholder="What did you learn?" />
      <Button type="submit" loading={saving} className="w-full">
        {session ? "Save changes" : "Log session"}
      </Button>
    </form>
  );

  if (embedded) return body;
  return (
    <Card style={{ animationDelay: "120ms" }}>
      <CardTitle icon={<Pencil className="h-4 w-4" />} title="Log a session" />
      {prefill && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-brand-500/10 px-3 py-2 text-xs font-medium text-brand-700 dark:text-brand-300">
          <AlertTriangle className="h-3.5 w-3.5" /> Timer result loaded — confirm and save.
        </div>
      )}
      {body}
    </Card>
  );
}
