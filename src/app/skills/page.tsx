"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { CheckCircle2, Circle, Eye, EyeOff, Mic, Pencil, Plus, Search, Shuffle, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge, DifficultyBadge, SkillDot } from "@/components/ui/Badge";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar, ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState, ErrorState, LoadingGrid } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError, cn, useFetch } from "@/lib/client";
import { DIFFICULTIES, SKILL_CATEGORIES, SKILL_COLOR_HEX, SKILL_COLORS } from "@/lib/constants";
import { minutesToLabel } from "@/lib/dates";
import type { QuestionDTO, SkillDTO } from "@/lib/types";

type View = "skills" | "interview";

const levelLabel = (l: number) => (l >= 85 ? "Expert" : l >= 70 ? "Proficient" : l >= 45 ? "Intermediate" : l >= 20 ? "Learning" : "Beginner");

export default function SkillsPage() {
  const [view, setView] = useState<View>("skills");
  const skills = useFetch<SkillDTO[]>("/api/skills");
  const [skillModal, setSkillModal] = useState<{ open: boolean; skill?: SkillDTO }>({ open: false });
  const [qModal, setQModal] = useState<{ open: boolean; question?: QuestionDTO }>({ open: false });
  const [qKey, setQKey] = useState(0);

  return (
    <div>
      <PageHeader
        emoji="🧠"
        title="Skills & Interview Prep"
        subtitle="Level up each skill with checklists, notes and real interview questions."
        actions={
          view === "skills" ? (
            <Button onClick={() => setSkillModal({ open: true })}>
              <Plus className="h-4 w-4" /> Custom skill
            </Button>
          ) : (
            <Button onClick={() => setQModal({ open: true })}>
              <Plus className="h-4 w-4" /> Add question
            </Button>
          )
        }
      />
      <Tabs<View>
        className="mb-5"
        value={view}
        onChange={setView}
        options={[
          { value: "skills", label: "Skills" },
          { value: "interview", label: "Interview questions" },
        ]}
      />

      {view === "skills" ? (
        skills.loading && !skills.data ? (
          <LoadingGrid count={6} className="h-72" />
        ) : skills.error ? (
          <ErrorState message={skills.error} onRetry={skills.hardReload} />
        ) : !skills.data?.length ? (
          <EmptyState emoji="🧠" title="No skills yet" description="Add the skills you're preparing for." action={<Button onClick={() => setSkillModal({ open: true })}>Add a skill</Button>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {skills.data.map((s, i) => (
              <SkillCard key={s.id} skill={s} index={i} onEdit={() => setSkillModal({ open: true, skill: s })} onChanged={skills.reload} />
            ))}
          </div>
        )
      ) : (
        <InterviewView key={qKey} skills={skills.data ?? []} onEdit={(q) => setQModal({ open: true, question: q })} />
      )}

      {skillModal.open && <SkillForm skill={skillModal.skill} onClose={() => setSkillModal({ open: false })} onSaved={skills.reload} />}
      {qModal.open && (
        <QuestionForm
          question={qModal.question}
          skills={skills.data ?? []}
          onClose={() => setQModal({ open: false })}
          onSaved={() => {
            setQKey((k) => k + 1);
            skills.reload();
          }}
        />
      )}
    </div>
  );
}

// ======================= Skill card =======================

function SkillCard({ skill, index, onEdit, onChanged }: { skill: SkillDTO; index: number; onEdit: () => void; onChanged: () => void }) {
  const { toast, celebrate, confirm } = useToast();
  const [level, setLevel] = useState(skill.level);
  const [items, setItems] = useState(skill.checklist);
  const [newItem, setNewItem] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(skill.notes ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const color = SKILL_COLOR_HEX[skill.color] ?? "#8b5cf6";
  const done = items.filter((c) => c.done).length;

  useEffect(() => setItems(skill.checklist), [skill.checklist]);
  useEffect(() => setLevel(skill.level), [skill.level]);

  const saveLevel = (v: number) => {
    setLevel(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await api(`/api/skills/${skill.id}`, { method: "PATCH", body: { level: v } });
        if (v >= 70 && skill.level < 70) celebrate(`${skill.name} is now Proficient! 🚀`);
        onChanged();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Couldn't save level", "error");
      }
    }, 500);
  };

  const toggleItem = async (id: number, value: boolean) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, done: value } : c)));
    try {
      await api(`/api/checklist/${id}`, { method: "PATCH", body: { done: value } });
      if (value && done + 1 === items.length) celebrate(`Checklist complete for ${skill.name}! 🏁`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
      onChanged();
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    try {
      const created = await api<SkillDTO["checklist"][number]>("/api/checklist", { method: "POST", body: { text: newItem, skillId: skill.id } });
      setItems((p) => [...p, created]);
      setNewItem("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const deleteItem = async (id: number) => {
    setItems((p) => p.filter((c) => c.id !== id));
    try {
      await api(`/api/checklist/${id}`, { method: "DELETE" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
      onChanged();
    }
  };

  const saveNotes = async () => {
    try {
      await api(`/api/skills/${skill.id}`, { method: "PATCH", body: { notes } });
      toast("Notes saved");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: `Delete ${skill.name}?`, message: "Its checklist is deleted too. Sessions, notes and questions are kept but unlinked.", confirmLabel: "Delete", danger: true }))) return;
    try {
      await api(`/api/skills/${skill.id}`, { method: "DELETE" });
      toast("Skill deleted");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  return (
    <Card hover className="relative flex flex-col overflow-hidden" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl" style={{ background: color }} />
      <div className="relative flex items-start gap-4">
        <ProgressRing value={level} size={72} stroke={8} color={color} track={`${color}22`}>
          <span className="text-lg font-black">{level}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold tracking-tight">{skill.name}</h3>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            <Badge>{skill.category}</Badge>
            <span className="chip text-white" style={{ background: color }}>{levelLabel(level)}</span>
          </div>
          {skill.description && <p className="mt-1.5 line-clamp-2 text-xs text-ink-soft dark:text-zinc-400">{skill.description}</p>}
        </div>
        <div className="flex">
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit skill">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={remove} aria-label="Delete skill" className="hover:text-rose-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="mb-1 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          <span>Self-assessed level</span>
          <span>
            {minutesToLabel(skill.minutes ?? 0)} studied · {skill._count?.questions ?? 0} Qs
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={level}
          onChange={(e) => saveLevel(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: color }}
          aria-label={`${skill.name} level`}
        />
      </div>

      <div className="relative mt-3 flex-1">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-ink-soft">Prep checklist</span>
          <span className="font-semibold">
            {done}/{items.length}
          </span>
        </div>
        <ProgressBar value={items.length ? (done / items.length) * 100 : 0} color={color} className="mb-2" />
        <ul className="space-y-0.5">
          {items.map((c) => (
            <li key={c.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-black/[0.03] dark:hover:bg-white/5">
              <button onClick={() => toggleItem(c.id, !c.done)} aria-label="Toggle">
                {c.done ? <CheckCircle2 className="h-[18px] w-[18px]" style={{ color }} /> : <Circle className="h-[18px] w-[18px] text-zinc-300 dark:text-zinc-600" />}
              </button>
              <span className={cn("flex-1", c.done && "text-ink-soft line-through")}>{c.text}</span>
              <button onClick={() => deleteItem(c.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Remove item">
                <X className="h-3.5 w-3.5 text-zinc-400 hover:text-rose-500" />
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addItem} className="mt-2 flex gap-2">
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add checklist item…" className="input py-1.5 text-xs" maxLength={200} />
          <Button size="sm" variant="soft" type="submit" disabled={!newItem.trim()}>
            Add
          </Button>
        </form>
      </div>

      <div className="relative mt-3 border-t border-black/5 pt-3 dark:border-white/10">
        <button onClick={() => setShowNotes(!showNotes)} className="text-xs font-semibold text-brand-600 dark:text-brand-300">
          {showNotes ? "Hide notes" : notes ? "Show notes" : "+ Add notes"}
        </button>
        {showNotes && (
          <div className="mt-2 space-y-2">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[90px] text-sm" placeholder="Key concepts, resources, gotchas…" />
            <Button size="sm" onClick={saveNotes}>
              Save notes
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ======================= Interview questions =======================

function InterviewView({ skills, onEdit }: { skills: SkillDTO[]; onEdit: (q: QuestionDTO) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [skillId, setSkillId] = useState("ALL");
  const [practice, setPractice] = useState<QuestionDTO | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error, loading, reload, hardReload, setData } = useFetch<QuestionDTO[]>(`/api/questions?q=${encodeURIComponent(debounced)}&skillId=${skillId}`);
  const { toast, confirm } = useToast();

  const avg = useMemo(() => (data?.length ? (data.reduce((a, x) => a + x.confidence, 0) / data.length).toFixed(1) : "–"), [data]);
  const ready = data?.filter((x) => x.confidence >= 4).length ?? 0;

  const rate = async (question: QuestionDTO, confidence: number) => {
    setData((prev) => prev?.map((x) => (x.id === question.id ? { ...x, confidence, lastReviewed: new Date().toISOString() } : x)) ?? null);
    try {
      await api(`/api/questions/${question.id}`, { method: "PATCH", body: { confidence } });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
      reload();
    }
  };

  const remove = async (question: QuestionDTO) => {
    if (!(await confirm({ title: "Delete question?", message: question.question, confirmLabel: "Delete", danger: true }))) return;
    try {
      await api(`/api/questions/${question.id}`, { method: "DELETE" });
      toast("Question deleted");
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const startPractice = () => {
    if (!data?.length) return;
    // Weighted towards low-confidence questions
    const pool = data.flatMap((x) => Array(6 - x.confidence).fill(x) as QuestionDTO[]);
    setPractice(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-3xl font-black">{data?.length ?? "–"}</div>
          <div className="text-xs text-ink-soft">questions</div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-black text-emerald-500">{ready}</div>
          <div className="text-xs text-ink-soft">interview-ready (4+ confidence)</div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-black">{avg}</div>
          <div className="text-xs text-ink-soft">average confidence / 5</div>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-9" placeholder="Search questions & answers…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input sm:w-56" value={skillId} onChange={(e) => setSkillId(e.target.value)} aria-label="Filter by skill">
          <option value="ALL">All skills</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <Button variant="soft" onClick={startPractice} disabled={!data?.length}>
          <Shuffle className="h-4 w-4" /> Practice mode
        </Button>
      </div>

      {loading && !data ? (
        <LoadingGrid count={4} className="h-32" />
      ) : error ? (
        <ErrorState message={error} onRetry={hardReload} />
      ) : !data?.length ? (
        <EmptyState emoji="🎤" title="No interview questions yet" description="Add questions you've been asked (or expect), with your best answer." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.map((item, i) => (
            <QuestionCard key={item.id} q={item} index={i} onRate={(c) => rate(item, c)} onEdit={() => onEdit(item)} onDelete={() => remove(item)} />
          ))}
        </div>
      )}

      {practice && (
        <PracticeModal
          question={practice}
          onClose={() => setPractice(null)}
          onRate={async (c) => {
            await rate(practice, c);
            startPractice();
          }}
        />
      )}
    </div>
  );
}

function ConfidencePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labels = ["", "Blank", "Shaky", "Okay", "Good", "Nailed it"];
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          title={labels[n]}
          className={cn(
            "h-7 w-7 rounded-lg text-xs font-bold transition hover:scale-110",
            n <= value ? (value >= 4 ? "bg-emerald-500 text-white" : value === 3 ? "bg-amber-500 text-white" : "bg-rose-500 text-white") : "bg-black/5 text-ink-soft dark:bg-white/10",
          )}
        >
          {n}
        </button>
      ))}
      <span className="ml-1 text-xs text-ink-soft">{labels[value]}</span>
    </div>
  );
}

function QuestionCard({ q, index, onRate, onEdit, onDelete }: { q: QuestionDTO; index: number; onRate: (c: number) => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card hover className="group" style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
          <Mic className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {q.skill && (
              <Badge>
                <SkillDot color={q.skill.color} /> {q.skill.name}
              </Badge>
            )}
            <DifficultyBadge difficulty={q.difficulty} />
            {q.lastReviewed && <span className="text-[11px] text-ink-soft">reviewed {formatDistanceToNow(parseISO(q.lastReviewed), { addSuffix: true })}</span>}
          </div>
          <h3 className="mt-2 font-semibold leading-snug">{q.question}</h3>
          {q.answer && (
            <>
              <button onClick={() => setOpen(!open)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
                {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {open ? "Hide answer" : "Reveal answer"}
              </button>
              {open && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-black/[0.03] p-3 text-sm leading-relaxed animate-fade-up dark:bg-white/5">{q.answer}</p>}
            </>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <ConfidencePicker value={q.confidence} onChange={onRate} />
            <div className="flex sm:opacity-0 sm:group-hover:opacity-100">
              <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete" className="hover:text-rose-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PracticeModal({ question, onClose, onRate }: { question: QuestionDTO; onClose: () => void; onRate: (c: number) => void }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => setRevealed(false), [question.id]);
  return (
    <Modal open onClose={onClose} title="Practice mode 🎤" size="md">
      <div className="text-center">
        {question.skill && (
          <Badge className="mb-3">
            <SkillDot color={question.skill.color} /> {question.skill.name}
          </Badge>
        )}
        <h3 className="text-xl font-bold leading-snug">{question.question}</h3>
        <p className="mt-2 text-sm text-ink-soft">Answer out loud first — like you&apos;re in the interview. Then reveal.</p>
        {revealed ? (
          <div className="mt-5 animate-fade-up text-left">
            <p className="whitespace-pre-wrap rounded-2xl bg-brand-500/[0.06] p-4 text-sm leading-relaxed">{question.answer || "No saved answer yet."}</p>
            <div className="mt-5 text-center">
              <div className="label">How did you do?</div>
              <div className="flex justify-center">
                <ConfidencePicker value={0} onChange={onRate} />
              </div>
            </div>
          </div>
        ) : (
          <Button className="mt-6" onClick={() => setRevealed(true)}>
            <Eye className="h-4 w-4" /> Reveal answer
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ======================= Forms =======================

function SkillForm({ skill, onClose, onSaved }: { skill?: SkillDTO; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: skill?.name ?? "",
    category: skill?.category ?? "Frontend",
    level: skill?.level ?? 10,
    color: skill?.color ?? "violet",
    description: skill?.description ?? "",
    notes: skill?.notes ?? "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErrors({ name: "Skill name is required" });
    setSaving(true);
    try {
      await api(skill ? `/api/skills/${skill.id}` : "/api/skills", { method: skill ? "PUT" : "POST", body: form });
      toast(skill ? "Skill updated" : "Skill added 🧠");
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) setErrors({ ...err.fields, ...(err.status === 409 ? { name: err.message } : {}) });
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={skill ? "Edit skill" : "New custom skill"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="skill-form" loading={saving}>{skill ? "Save" : "Add skill"}</Button>
        </>
      }
    >
      <form id="skill-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Skill" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="e.g. GraphQL, Docker, Redux" autoFocus />
          <Select label="Category" name="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={SKILL_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </div>
        <div>
          <div className="label">Color</div>
          <div className="flex flex-wrap gap-2">
            {SKILL_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={cn("h-8 w-8 rounded-full transition hover:scale-110", form.color === c && "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900")}
                style={{ background: SKILL_COLOR_HEX[c], ["--tw-ring-color" as string]: SKILL_COLOR_HEX[c] }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="label">Current level: {form.level}%</div>
          <input type="range" min={0} max={100} step={5} value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} className="w-full" style={{ accentColor: SKILL_COLOR_HEX[form.color] }} />
        </div>
        <Input label="Short description" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} />
        <Textarea label="Notes" name="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </form>
    </Modal>
  );
}

function QuestionForm({ question, skills, onClose, onSaved }: { question?: QuestionDTO; skills: SkillDTO[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    question: question?.question ?? "",
    answer: question?.answer ?? "",
    difficulty: question?.difficulty ?? "MEDIUM",
    confidence: question?.confidence ?? 2,
    skillId: String(question?.skillId ?? ""),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim()) return setErrors({ question: "Write the question" });
    setSaving(true);
    try {
      await api(question ? `/api/questions/${question.id}` : "/api/questions", {
        method: question ? "PUT" : "POST",
        body: { ...form, skillId: form.skillId || null },
      });
      toast(question ? "Question updated" : "Question added 🎤");
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
      title={question ? "Edit question" : "New interview question"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="q-form" loading={saving}>{question ? "Save" : "Add question"}</Button>
        </>
      }
    >
      <form id="q-form" onSubmit={submit} className="space-y-4">
        <Textarea label="Question" name="question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} error={errors.question} className="[&_textarea]:min-h-[70px]" autoFocus />
        <Textarea label="Your answer" name="answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} className="[&_textarea]:min-h-[140px]" placeholder="Write the answer you'd give in an interview…" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Skill" name="skillId" value={form.skillId} onChange={(e) => setForm({ ...form, skillId: e.target.value })} options={[{ value: "", label: "— General —" }, ...skills.map((s) => ({ value: String(s.id), label: s.name }))]} />
          <Select label="Difficulty" name="difficulty" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} options={DIFFICULTIES.map((d) => ({ value: d, label: d.charAt(0) + d.slice(1).toLowerCase() }))} />
        </div>
        <div>
          <div className="label">Confidence</div>
          <ConfidencePicker value={form.confidence} onChange={(c) => setForm({ ...form, confidence: c })} />
        </div>
      </form>
    </Modal>
  );
}
