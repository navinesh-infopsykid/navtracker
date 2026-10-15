"use client";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { CodeBlock, CopyButton } from "@/components/ui/CopyButton";
import { Input, Select, Textarea, Toggle } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError, cn, useFetch } from "@/lib/client";
import { DIFFICULTIES, DSA_STATUSES, DSA_TOPICS, LANGUAGES, PLATFORMS } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import type { DsaDTO } from "@/lib/types";

export default function DsaPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [difficulty, setDifficulty] = useState("ALL");
  const [topic, setTopic] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [due, setDue] = useState(false);
  const [starred, setStarred] = useState(false);
  const [formOpen, setFormOpen] = useState<{ open: boolean; problem?: DsaDTO }>({ open: false });
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const { toast, celebrate, confirm } = useToast();

  // Support links like /dsa?due=1 from the dashboard
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("due") === "1") setDue(true);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ q: debouncedQ, difficulty, topic, status, due: due ? "1" : "", starred: starred ? "1" : "" });
  const { data, error, loading, reload, hardReload, setData } = useFetch<DsaDTO[]>(`/api/dsa?${params}`);
  const all = useFetch<DsaDTO[]>("/api/dsa");

  const stats = useMemo(() => {
    const list = all.data ?? [];
    const solved = list.filter((p) => p.status === "SOLVED");
    const today = new Date();
    return {
      total: solved.length,
      easy: solved.filter((p) => p.difficulty === "EASY").length,
      medium: solved.filter((p) => p.difficulty === "MEDIUM").length,
      hard: solved.filter((p) => p.difficulty === "HARD").length,
      due: list.filter((p) => p.nextRevision && !isBefore(today, startOfDay(parseISO(p.nextRevision)))).length,
      todo: list.filter((p) => p.status === "TODO").length,
      topics: Array.from(new Set([...DSA_TOPICS, ...list.map((p) => p.topic)])).sort(),
    };
  }, [all.data]);

  const refresh = () => {
    reload();
    all.reload();
  };

  const toggleStar = async (p: DsaDTO) => {
    setData((prev) => prev?.map((x) => (x.id === p.id ? { ...x, starred: !x.starred } : x)) ?? null);
    try {
      await api(`/api/dsa/${p.id}`, { method: "PATCH", body: { action: "star", starred: !p.starred } });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
      reload();
    }
  };

  const solve = async (p: DsaDTO) => {
    try {
      const updated = await api<DsaDTO>(`/api/dsa/${p.id}`, { method: "PATCH", body: { action: "solve" } });
      celebrate(`Solved ${p.title}! Re-solve it on ${format(parseISO(updated.nextRevision!), "MMM d")} without looking 🧠`);
      setData((prev) => prev?.map((x) => (x.id === p.id ? updated : x)) ?? null);
      all.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const revise = async (p: DsaDTO) => {
    try {
      const updated = await api<DsaDTO>(`/api/dsa/${p.id}`, { method: "PATCH", body: { action: "revise" } });
      celebrate(`Revised! Next review ${format(parseISO(updated.nextRevision!), "MMM d")} 🔁`);
      setData((prev) => prev?.map((x) => (x.id === p.id ? updated : x)) ?? null);
      all.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const remove = async (p: DsaDTO) => {
    if (!(await confirm({ title: "Delete problem?", message: `"${p.title}" and its saved code will be removed.`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await api(`/api/dsa/${p.id}`, { method: "DELETE" });
      setViewIndex(null);
      toast("Problem deleted");
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const viewing = viewIndex !== null && data ? data[viewIndex] : null;

  return (
    <div>
      <PageHeader
        emoji="🧩"
        title="DSA Tracker"
        subtitle="Every problem you solve, saved for interview-day revision."
        actions={
          <Button onClick={() => setFormOpen({ open: true })}>
            <Plus className="h-4 w-4" /> Log problem
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3 lg:grid-cols-6">
        {[
          { label: "Solved", v: stats.total, c: "from-sky-500 to-blue-600" },
          { label: "Easy", v: stats.easy, c: "from-emerald-500 to-green-600" },
          { label: "Medium", v: stats.medium, c: "from-amber-500 to-orange-500" },
          { label: "Hard", v: stats.hard, c: "from-rose-500 to-pink-600" },
          { label: "Due revision", v: stats.due, c: "from-violet-500 to-fuchsia-500" },
          { label: "Still to do", v: stats.todo, c: "from-zinc-600 to-zinc-800" },
        ].map((s, i) => (
          <div key={s.label} className={cn("rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg animate-fade-up", s.c)} style={{ animationDelay: `${i * 50}ms` }}>
            <div className="text-3xl font-black">{all.loading && !all.data ? "–" : s.v}</div>
            <div className="text-xs font-semibold opacity-90">{s.label}</div>
          </div>
        ))}
      </div>

      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input className="input pl-9" placeholder="Search title, topic, approach…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
            <option value="ALL">All difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic">
            <option value="ALL">All topics</option>
            {stats.topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="ALL">Any status</option>
            {DSA_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-5">
          <Toggle checked={due} onChange={setDue} label="Due for revision" />
          <Toggle checked={starred} onChange={setStarred} label="Starred (interview set)" />
        </div>
      </Card>

      {loading && !data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={hardReload} />
      ) : !data?.length ? (
        <EmptyState
          emoji={due ? "🎉" : "🧩"}
          title={due ? "Nothing due for revision" : "No problems found"}
          description={due ? "You're all caught up. Solve something new!" : "Log a problem with your code and approach so you can revise it before interviews."}
          action={!due && <Button onClick={() => setFormOpen({ open: true })}>Log your first problem</Button>}
        />
      ) : (
        <div className="space-y-2">
          {data.map((p, i) => {
            const isDue = p.nextRevision && !isBefore(new Date(), startOfDay(parseISO(p.nextRevision)));
            return (
              <div
                key={p.id}
                onClick={() => setViewIndex(i)}
                className="card card-hover flex cursor-pointer items-center gap-3 p-4 animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(p);
                  }}
                  aria-label="Star"
                  className="shrink-0"
                >
                  <Star className={cn("h-5 w-5 transition hover:scale-110", p.starred ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-600")} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{p.title}</span>
                    <DifficultyBadge difficulty={p.difficulty} />
                    {p.status === "TODO" ? (
                      <Badge>to do</Badge>
                    ) : (
                      p.status !== "SOLVED" && <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">{p.status.toLowerCase()}</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                    <span>{p.topic}</span>
                    <span>{p.platform}</span>
                    {p.timeComplexity && <span className="font-mono">T: {p.timeComplexity}</span>}
                    <span>
                      {p.status === "TODO" ? "Planned" : "Solved"} {format(parseISO(p.solvedAt), "MMM d")}
                    </span>
                    {p.revisionCount > 0 && <span>🔁 {p.revisionCount}×</span>}
                  </div>
                </div>
                {p.nextRevision && (
                  <span className={cn("chip hidden sm:inline-flex", isDue ? "bg-violet-500/15 text-violet-700 dark:text-violet-300" : "bg-black/5 text-ink-soft dark:bg-white/10")}>
                    {isDue ? "Revise now" : `Revise ${format(parseISO(p.nextRevision), "MMM d")}`}
                  </span>
                )}
                {p.code && (
                  <span onClick={(e) => e.stopPropagation()} className="hidden md:block">
                    <CopyButton text={p.code} className="bg-black/5 text-ink-soft hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / revision viewer */}
      {viewing && (
        <Modal
          open
          size="lg"
          onClose={() => setViewIndex(null)}
          title={viewing.title}
          footer={
            <div className="flex w-full flex-wrap items-center gap-2">
              <Button variant="ghost" size="icon" disabled={viewIndex === 0} onClick={() => setViewIndex((i) => (i ?? 1) - 1)} aria-label="Previous">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-xs text-ink-soft">
                {(viewIndex ?? 0) + 1} / {data?.length}
              </span>
              <Button variant="ghost" size="icon" disabled={viewIndex === (data?.length ?? 1) - 1} onClick={() => setViewIndex((i) => (i ?? 0) + 1)} aria-label="Next">
                <ChevronRight className="h-5 w-5" />
              </Button>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="ghost" size="icon" onClick={() => remove(viewing)} className="hover:text-rose-500" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="secondary" onClick={() => setFormOpen({ open: true, problem: viewing })}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                {viewing.status === "SOLVED" ? (
                  <Button onClick={() => revise(viewing)}>
                    <RefreshCcw className="h-4 w-4" /> Mark revised
                  </Button>
                ) : (
                  <Button onClick={() => solve(viewing)}>
                    <CheckCircle2 className="h-4 w-4" /> Mark solved
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={viewing.difficulty} />
              <Badge>{viewing.topic}</Badge>
              <Badge>{viewing.platform}</Badge>
              <Badge>{viewing.language}</Badge>
              {viewing.url && (
                <a href={viewing.url} target="_blank" rel="noreferrer" className="chip bg-brand-500/10 text-brand-700 hover:bg-brand-500/20 dark:text-brand-300">
                  Open problem <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Time", viewing.timeComplexity ?? "—"],
                ["Space", viewing.spaceComplexity ?? "—"],
                ["Revisions", String(viewing.revisionCount)],
                ["Next review", viewing.nextRevision ? format(parseISO(viewing.nextRevision), "MMM d") : "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{k}</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold">{v}</div>
                </div>
              ))}
            </div>
            {viewing.status === "TODO" && (
              <div className="rounded-2xl bg-amber-500/10 p-4 text-sm">
                <b>25-minute rule:</b> try for 25 min → read the solution → close it and write it yourself → re-solve in 3 days. Write the idea in one English sentence before coding.
              </div>
            )}
            {viewing.approach && (
              <div>
                <div className="label">Approach</div>
                <p className="whitespace-pre-wrap rounded-2xl bg-brand-500/[0.06] p-4 text-sm leading-relaxed">{viewing.approach}</p>
              </div>
            )}
            {viewing.code ? (
              <div>
                <div className="label">Solution</div>
                <CodeBlock code={viewing.code} language={viewing.language} />
              </div>
            ) : (
              <p className="text-sm text-ink-soft">No code saved yet — edit to add your solution.</p>
            )}
          </div>
        </Modal>
      )}

      {formOpen.open && (
        <DsaForm
          problem={formOpen.problem}
          topics={stats.topics}
          onClose={() => setFormOpen({ open: false })}
          onSaved={(saved) => {
            refresh();
            if (viewing && saved.id === viewing.id) setData((prev) => prev?.map((x) => (x.id === saved.id ? saved : x)) ?? null);
          }}
        />
      )}
    </div>
  );
}

function DsaForm({ problem, topics, onClose, onSaved }: { problem?: DsaDTO; topics: string[]; onClose: () => void; onSaved: (p: DsaDTO) => void }) {
  const { toast, celebrate } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: problem?.title ?? "",
    url: problem?.url ?? "",
    platform: problem?.platform ?? "LeetCode",
    topic: problem?.topic ?? "Arrays",
    difficulty: problem?.difficulty ?? "MEDIUM",
    status: problem?.status ?? "SOLVED",
    language: problem?.language ?? "TypeScript",
    code: problem?.code ?? "",
    approach: problem?.approach ?? "",
    timeComplexity: problem?.timeComplexity ?? "",
    spaceComplexity: problem?.spaceComplexity ?? "",
    starred: problem?.starred ?? false,
    solvedAt: toDateInput(problem?.solvedAt ?? new Date()),
    nextRevision: problem ? toDateInput(problem.nextRevision) : toDateInput(addDays(new Date(), 3)),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.title.trim()) local.title = "Problem title is required";
    if (!form.topic.trim()) local.topic = "Pick a topic";
    if (form.url && !/^https?:\/\//.test(form.url)) local.url = "Link must start with http:// or https://";
    setErrors(local);
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      const saved = await api<DsaDTO>(problem ? `/api/dsa/${problem.id}` : "/api/dsa", { method: problem ? "PUT" : "POST", body: form });
      if (problem) toast("Problem updated");
      else celebrate(`Problem logged! +${form.difficulty === "HARD" ? 35 : form.difficulty === "MEDIUM" ? 20 : 10} XP 🧠`);
      onSaved(saved);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) setErrors(err.fields);
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  // Tab inserts two spaces inside the code editor
  const onCodeKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: end } = el;
    const next = form.code.slice(0, s) + "  " + form.code.slice(end);
    setForm({ ...form, code: next });
    requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
  };

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={problem ? "Edit problem" : "Log a problem"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="dsa-form" loading={saving}>
            <Code2 className="h-4 w-4" /> {problem ? "Save changes" : "Save problem"}
          </Button>
        </>
      }
    >
      <form id="dsa-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Input label="Problem" name="title" value={form.title} onChange={set("title")} error={errors.title} placeholder="e.g. Two Sum" autoFocus />
          <Select label="Platform" name="platform" value={form.platform} onChange={set("platform")} options={PLATFORMS.map((p) => ({ value: p, label: p }))} />
        </div>
        <Input label="Link" name="url" value={form.url} onChange={set("url")} error={errors.url} placeholder="https://leetcode.com/problems/…" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="topic">Topic</label>
            <input id="topic" list="dsa-topics" className={cn("input", errors.topic && "border-rose-400")} value={form.topic} onChange={set("topic")} />
            <datalist id="dsa-topics">
              {topics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {errors.topic && <p className="mt-1 text-xs text-rose-500">{errors.topic}</p>}
          </div>
          <Select label="Difficulty" name="difficulty" value={form.difficulty} onChange={set("difficulty")} options={DIFFICULTIES.map((d) => ({ value: d, label: d.charAt(0) + d.slice(1).toLowerCase() }))} />
          <Select label="Status" name="status" value={form.status} onChange={set("status")} options={DSA_STATUSES.map((d) => ({ value: d, label: d.charAt(0) + d.slice(1).toLowerCase() }))} />
          <Select label="Language" name="language" value={form.language} onChange={set("language")} options={LANGUAGES.map((l) => ({ value: l, label: l }))} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input label="Time" name="timeComplexity" value={form.timeComplexity} onChange={set("timeComplexity")} placeholder="O(n)" />
          <Input label="Space" name="spaceComplexity" value={form.spaceComplexity} onChange={set("spaceComplexity")} placeholder="O(1)" />
          <Input label={form.status === "TODO" ? "Planned for" : "Solved on"} name="solvedAt" type="date" value={form.solvedAt} onChange={set("solvedAt")} error={errors.solvedAt} />
          <Input label="Revise on" name="nextRevision" type="date" value={form.nextRevision} onChange={set("nextRevision")} error={errors.nextRevision} />
        </div>
        <Textarea label="Approach" name="approach" value={form.approach} onChange={set("approach")} placeholder="Key insight, pattern used, edge cases…" />
        <div>
          <label className="label" htmlFor="code">Solution code</label>
          <textarea
            id="code"
            value={form.code}
            onChange={set("code")}
            onKeyDown={onCodeKey}
            spellCheck={false}
            placeholder="// paste your solution"
            className="input min-h-[220px] resize-y bg-[#1e1e24] font-mono text-[13px] leading-6 text-zinc-100 dark:bg-[#1e1e24]"
          />
        </div>
        <Toggle checked={form.starred} onChange={(v) => setForm({ ...form, starred: v })} label="⭐ Add to interview revision set" />
      </form>
    </Modal>
  );
}
