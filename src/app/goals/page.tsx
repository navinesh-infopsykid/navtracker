"use client";
import { useMemo, useState } from "react";
import { format, parseISO, startOfDay } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Flag,
  Pencil,
  Plus,
  RotateCcw,
  Target,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge, PriorityBadge } from "@/components/ui/Badge";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState, ErrorState, LoadingGrid, Skeleton } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError, cn, useFetch } from "@/lib/client";
import { PRIORITIES, TIMEFRAMES } from "@/lib/constants";
import { minutesToLabel, toDateInput } from "@/lib/dates";
import type { GoalDTO, TaskDTO } from "@/lib/types";

type View = "tasks" | "goals";
type TaskFilter = "today" | "upcoming" | "overdue" | "open" | "completed";

const TIMEFRAME_STYLE: Record<string, string> = {
  YEARLY: "from-violet-500 to-fuchsia-500",
  MONTHLY: "from-sky-500 to-indigo-500",
  WEEKLY: "from-emerald-500 to-teal-500",
  DAILY: "from-amber-500 to-orange-500",
};

export default function GoalsPage() {
  const [view, setView] = useState<View>("tasks");
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: TaskDTO; goalId?: number }>({ open: false });
  const [goalModal, setGoalModal] = useState<{ open: boolean; goal?: GoalDTO }>({ open: false });
  const goals = useFetch<GoalDTO[]>("/api/goals");
  const [taskKey, setTaskKey] = useState(0);

  const refreshAll = () => {
    goals.reload();
    setTaskKey((k) => k + 1);
  };

  return (
    <div>
      <PageHeader
        emoji="🎯"
        title="Goals & Tasks"
        subtitle="Big goals, broken into small daily wins."
        actions={
          <>
            <Button variant="secondary" onClick={() => setGoalModal({ open: true })}>
              <Target className="h-4 w-4" /> New goal
            </Button>
            <Button onClick={() => setTaskModal({ open: true })}>
              <Plus className="h-4 w-4" /> New task
            </Button>
          </>
        }
      />
      <Tabs<View>
        className="mb-5"
        value={view}
        onChange={setView}
        options={[
          { value: "tasks", label: "Tasks" },
          { value: "goals", label: "Goals" },
        ]}
      />

      {view === "tasks" ? (
        <TasksView key={taskKey} onEdit={(task) => setTaskModal({ open: true, task })} onChanged={() => goals.reload()} />
      ) : (
        <GoalsView
          state={goals}
          onEdit={(goal) => setGoalModal({ open: true, goal })}
          onAddTask={(goalId) => setTaskModal({ open: true, goalId })}
          onEditTask={(task) => setTaskModal({ open: true, task })}
          onChanged={refreshAll}
          onCreate={() => setGoalModal({ open: true })}
        />
      )}

      {taskModal.open && (
        <TaskForm
          task={taskModal.task}
          defaultGoalId={taskModal.goalId}
          goals={goals.data ?? []}
          onClose={() => setTaskModal({ open: false })}
          onSaved={refreshAll}
        />
      )}
      {goalModal.open && (
        <GoalForm goal={goalModal.goal} goals={goals.data ?? []} onClose={() => setGoalModal({ open: false })} onSaved={refreshAll} />
      )}
    </div>
  );
}

// ======================= Tasks =======================

function TasksView({ onEdit, onChanged }: { onEdit: (t: TaskDTO) => void; onChanged: () => void }) {
  const [filter, setFilter] = useState<TaskFilter>("today");
  const { data, error, loading, reload, hardReload, setData } = useFetch<TaskDTO[]>(`/api/tasks?filter=${filter}`);
  const { toast, celebrate, confirm } = useToast();

  const toggle = async (t: TaskDTO) => {
    // optimistic update for a snappy feel
    setData((prev) => prev?.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)) ?? null);
    try {
      await api(`/api/tasks/${t.id}`, { method: "PATCH", body: { completed: !t.completed } });
      if (!t.completed) celebrate("Nice! Task completed · +10 XP");
      setTimeout(reload, 500);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error");
      reload();
    }
  };

  const remove = async (t: TaskDTO) => {
    if (!(await confirm({ title: "Delete task?", message: `"${t.title}" will be permanently removed.`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await api(`/api/tasks/${t.id}`, { method: "DELETE" });
      toast("Task deleted");
      reload();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const reschedule = async () => {
    try {
      const r = await api<{ rescheduled: number }>("/api/tasks/reschedule", { method: "POST" });
      toast(`Rescheduled ${r.rescheduled} overdue task(s) — fresh start! 💪`);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const totalMinutes = data?.filter((t) => !t.completed).reduce((a, t) => a + t.estimatedMinutes, 0) ?? 0;
  const today0 = startOfDay(new Date());

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs<TaskFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "today", label: "Today" },
            { value: "upcoming", label: "Upcoming" },
            { value: "overdue", label: "Overdue" },
            { value: "open", label: "All open" },
            { value: "completed", label: "Completed" },
          ]}
        />
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          {filter !== "completed" && data && data.length > 0 && <span>≈ {minutesToLabel(totalMinutes)} of work</span>}
          {filter === "overdue" && data && data.length > 0 && (
            <Button size="sm" variant="soft" onClick={reschedule}>
              <CalendarClock className="h-3.5 w-3.5" /> Reschedule all
            </Button>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={hardReload} />
      ) : !data?.length ? (
        <EmptyState
          emoji={filter === "overdue" ? "🙌" : filter === "completed" ? "🏁" : "🗓️"}
          title={filter === "overdue" ? "Nothing overdue — you're on track!" : filter === "completed" ? "No completed tasks yet" : "No tasks here"}
          description={filter === "today" ? "Add your top 3 tasks for today. Small, specific, finishable." : undefined}
        />
      ) : (
        <Card className="p-2 sm:p-3">
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {data.map((t) => {
              const overdue = !t.completed && t.deadline && parseISO(t.deadline) < today0;
              return (
                <li key={t.id} className="group flex items-start gap-3 rounded-2xl px-2 py-3 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <button onClick={() => toggle(t)} className="mt-0.5 shrink-0 transition hover:scale-110" aria-label={t.completed ? "Mark incomplete" : "Mark complete"}>
                    {t.completed ? <CheckCircle2 className="h-6 w-6 text-emerald-500 animate-pop" /> : <Circle className="h-6 w-6 text-zinc-300 hover:text-emerald-500 dark:text-zinc-600" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={cn("font-medium", t.completed && "text-ink-soft line-through")}>{t.title}</div>
                    {t.notes && <div className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{t.notes}</div>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                      <PriorityBadge priority={t.priority} />
                      {t.deadline && (
                        <Badge className={cn(overdue && "bg-rose-500/10 text-rose-600 dark:text-rose-300")}>
                          <CalendarClock className="h-3 w-3" /> {overdue ? "Overdue · " : ""}
                          {format(parseISO(t.deadline), "EEE, MMM d")}
                        </Badge>
                      )}
                      <Badge>
                        <Clock className="h-3 w-3" /> {minutesToLabel(t.estimatedMinutes)}
                      </Badge>
                      {t.goal && (
                        <Badge className="bg-brand-500/10 text-brand-700 dark:text-brand-300">
                          <Target className="h-3 w-3" /> {t.goal.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(t)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(t)} aria-label="Delete" className="hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ======================= Goals =======================

function GoalsView({
  state,
  onEdit,
  onAddTask,
  onEditTask,
  onChanged,
  onCreate,
}: {
  state: ReturnType<typeof useFetch<GoalDTO[]>>;
  onEdit: (g: GoalDTO) => void;
  onAddTask: (goalId: number) => void;
  onEditTask: (t: TaskDTO) => void;
  onChanged: () => void;
  onCreate: () => void;
}) {
  const [tf, setTf] = useState<string>("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const { toast, celebrate, confirm } = useToast();
  const { data, error, loading, hardReload } = state;

  const list = useMemo(
    () => (data ?? []).filter((g) => (tf === "ALL" || g.timeframe === tf) && (showArchived || g.status !== "ARCHIVED")),
    [data, tf, showArchived],
  );

  const setStatus = async (g: GoalDTO, status: string) => {
    try {
      await api(`/api/goals/${g.id}`, { method: "PATCH", body: { status } });
      if (status === "COMPLETED") celebrate(`Goal achieved: ${g.title} 🎯 +50 XP`);
      else toast(status === "ARCHIVED" ? "Goal archived" : "Goal reopened");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const remove = async (g: GoalDTO) => {
    if (!(await confirm({ title: "Delete goal?", message: "Its tasks will be kept but unlinked from this goal.", confirmLabel: "Delete", danger: true }))) return;
    try {
      await api(`/api/goals/${g.id}`, { method: "DELETE" });
      toast("Goal deleted");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const toggleTask = async (t: TaskDTO) => {
    try {
      await api(`/api/tasks/${t.id}`, { method: "PATCH", body: { completed: !t.completed } });
      if (!t.completed) celebrate();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tf}
          onChange={setTf}
          options={[{ value: "ALL", label: "All" }, ...TIMEFRAMES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))]}
        />
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-[rgb(var(--brand-500))]" />
          Show archived
        </label>
      </div>
      {loading && !data ? (
        <LoadingGrid count={4} className="h-56" />
      ) : error ? (
        <ErrorState message={error} onRetry={hardReload} />
      ) : !list.length ? (
        <EmptyState
          emoji="🎯"
          title="No goals yet"
          description="Start with one yearly goal, then break it into monthly and weekly goals."
          action={<Button onClick={onCreate}>Create a goal</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((g, i) => (
            <GoalCard
              key={g.id}
              goal={g}
              index={i}
              onEdit={() => onEdit(g)}
              onDelete={() => remove(g)}
              onStatus={(s) => setStatus(g, s)}
              onAddTask={() => onAddTask(g.id)}
              onToggleTask={toggleTask}
              onEditTask={onEditTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal: g,
  index,
  onEdit,
  onDelete,
  onStatus,
  onAddTask,
  onToggleTask,
  onEditTask,
}: {
  goal: GoalDTO;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: string) => void;
  onAddTask: () => void;
  onToggleTask: (t: TaskDTO) => void;
  onEditTask: (t: TaskDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  const done = g.tasks.filter((t) => t.completed).length;
  const progress = g.status === "COMPLETED" ? 100 : g.tasks.length ? Math.round((done / g.tasks.length) * 100) : 0;
  const overdue = g.status === "ACTIVE" && g.deadline && parseISO(g.deadline) < startOfDay(new Date());
  const remaining = g.tasks.filter((t) => !t.completed).reduce((a, t) => a + t.estimatedMinutes, 0);

  return (
    <Card hover className={cn("relative overflow-hidden", g.status === "ARCHIVED" && "opacity-60")} style={{ animationDelay: `${index * 50}ms` }}>
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", TIMEFRAME_STYLE[g.timeframe])} />
      <div className="flex items-start gap-4">
        <ProgressRing value={progress} size={64} stroke={7} color={g.status === "COMPLETED" ? "#30d158" : undefined} colorTo={g.status === "COMPLETED" ? "#a6ff00" : "rgb(var(--brand-alt))"}>
          <span className="text-sm font-bold">{g.status === "COMPLETED" ? "✓" : `${progress}%`}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("chip bg-gradient-to-r text-white", TIMEFRAME_STYLE[g.timeframe])}>{g.timeframe.toLowerCase()}</span>
            <PriorityBadge priority={g.priority} />
            <Badge>{g.category}</Badge>
            {g.status === "COMPLETED" && <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">completed</Badge>}
          </div>
          <h3 className={cn("mt-2 font-semibold leading-snug", g.status === "COMPLETED" && "text-ink-soft line-through")}>{g.title}</h3>
          {g.description && <p className="mt-1 line-clamp-2 text-sm text-ink-soft dark:text-zinc-400">{g.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
            {g.deadline && (
              <span className={cn("inline-flex items-center gap-1", overdue && "font-semibold text-rose-500")}>
                <Flag className="h-3 w-3" /> {overdue ? "Overdue · " : "Due "}
                {format(parseISO(g.deadline), "MMM d, yyyy")}
              </span>
            )}
            <span>
              {done}/{g.tasks.length} tasks
            </span>
            {remaining > 0 && <span>≈ {minutesToLabel(remaining)} left</span>}
            {g.parent && <span>↳ {g.parent.title}</span>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="soft" onClick={onAddTask}>
          <Plus className="h-3.5 w-3.5" /> Task
        </Button>
        {g.status === "ACTIVE" ? (
          <Button size="sm" variant="secondary" onClick={() => onStatus("COMPLETED")}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => onStatus("ACTIVE")}>
            <RotateCcw className="h-3.5 w-3.5" /> Reopen
          </Button>
        )}
        {g.status !== "ARCHIVED" && (
          <Button size="sm" variant="ghost" onClick={() => onStatus("ARCHIVED")}>
            Archive
          </Button>
        )}
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit goal">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete goal" className="hover:text-rose-500">
            <Trash2 className="h-4 w-4" />
          </Button>
          {g.tasks.length > 0 && (
            <Button size="icon" variant="ghost" onClick={() => setOpen(!open)} aria-label="Show tasks">
              <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
            </Button>
          )}
        </div>
      </div>

      {open && (
        <ul className="mt-3 space-y-1 border-t border-black/5 pt-3 dark:border-white/10">
          {g.tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-sm">
              <button onClick={() => onToggleTask(t)} aria-label="Toggle task">
                {t.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />}
              </button>
              <button className={cn("flex-1 truncate text-left hover:underline", t.completed && "text-ink-soft line-through")} onClick={() => onEditTask(t)}>
                {t.title}
              </button>
              {t.deadline && <span className="text-xs text-ink-soft">{format(parseISO(t.deadline), "MMM d")}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ======================= Forms =======================

function TaskForm({
  task,
  defaultGoalId,
  goals,
  onClose,
  onSaved,
}: {
  task?: TaskDTO;
  defaultGoalId?: number;
  goals: GoalDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    priority: task?.priority ?? "MEDIUM",
    estimatedMinutes: String(task?.estimatedMinutes ?? 30),
    deadline: task ? toDateInput(task.deadline) : toDateInput(new Date()),
    goalId: String(task?.goalId ?? defaultGoalId ?? ""),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.title.trim()) local.title = "Give your task a title";
    if (!Number(form.estimatedMinutes) || Number(form.estimatedMinutes) < 5) local.estimatedMinutes = "At least 5 minutes";
    setErrors(local);
    if (Object.keys(local).length) return;

    setSaving(true);
    try {
      await api(task ? `/api/tasks/${task.id}` : "/api/tasks", {
        method: task ? "PUT" : "POST",
        body: { ...form, estimatedMinutes: Number(form.estimatedMinutes), goalId: form.goalId || null },
      });
      toast(task ? "Task updated" : "Task added ✅");
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) setErrors(err.fields);
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? "Edit task" : "New task"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="task-form" loading={saving}>{task ? "Save changes" : "Add task"}</Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-4">
        <Input label="Title" name="title" value={form.title} onChange={set("title")} error={errors.title} placeholder="e.g. Solve 3 sliding window problems" autoFocus />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Priority" name="priority" value={form.priority} onChange={set("priority")} options={PRIORITIES.map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }))} />
          <Input label="Estimate (min)" name="estimatedMinutes" type="number" min={5} step={5} value={form.estimatedMinutes} onChange={set("estimatedMinutes")} error={errors.estimatedMinutes} />
          <Input label="Deadline" name="deadline" type="date" value={form.deadline} onChange={set("deadline")} error={errors.deadline} />
        </div>
        <Select
          label="Goal"
          name="goalId"
          value={form.goalId}
          onChange={set("goalId")}
          options={[{ value: "", label: "— No goal —" }, ...goals.filter((g) => g.status !== "ARCHIVED").map((g) => ({ value: String(g.id), label: `${g.title} (${g.timeframe.toLowerCase()})` }))]}
        />
        <Textarea label="Notes" name="notes" value={form.notes} onChange={set("notes")} error={errors.notes} placeholder="Links, sub-steps, anything useful…" />
      </form>
    </Modal>
  );
}

function GoalForm({ goal, goals, onClose, onSaved }: { goal?: GoalDTO; goals: GoalDTO[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: goal?.title ?? "",
    description: goal?.description ?? "",
    timeframe: goal?.timeframe ?? "WEEKLY",
    category: goal?.category ?? "General",
    priority: goal?.priority ?? "MEDIUM",
    status: goal?.status ?? "ACTIVE",
    deadline: toDateInput(goal?.deadline),
    parentId: String(goal?.parentId ?? ""),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setErrors({ title: "Give your goal a title" });
    setSaving(true);
    try {
      await api(goal ? `/api/goals/${goal.id}` : "/api/goals", {
        method: goal ? "PUT" : "POST",
        body: { ...form, parentId: form.parentId || null },
      });
      toast(goal ? "Goal updated" : "Goal created 🎯");
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) setErrors(err.fields);
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={goal ? "Edit goal" : "New goal"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="goal-form" loading={saving}>{goal ? "Save changes" : "Create goal"}</Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={submit} className="space-y-4">
        <Input label="Goal" name="title" value={form.title} onChange={set("title")} error={errors.title} placeholder="e.g. Master React hooks this month" autoFocus />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Timeframe" name="timeframe" value={form.timeframe} onChange={set("timeframe")} options={TIMEFRAMES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))} />
          <Select label="Priority" name="priority" value={form.priority} onChange={set("priority")} options={PRIORITIES.map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }))} />
          <Input label="Deadline" name="deadline" type="date" value={form.deadline} onChange={set("deadline")} error={errors.deadline} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Category" name="category" value={form.category} onChange={set("category")} placeholder="Career, DSA, Frontend…" />
          <Select
            label="Part of (parent goal)"
            name="parentId"
            value={form.parentId}
            onChange={set("parentId")}
            error={errors.parentId}
            options={[{ value: "", label: "— None —" }, ...goals.filter((g) => g.id !== goal?.id).map((g) => ({ value: String(g.id), label: g.title }))]}
          />
        </div>
        {goal && (
          <Select label="Status" name="status" value={form.status} onChange={set("status")} options={["ACTIVE", "COMPLETED", "ARCHIVED"].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
        )}
        <Textarea label="Why it matters / details" name="description" value={form.description} onChange={set("description")} />
      </form>
    </Modal>
  );
}
