"use client";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Download, Mic, Moon, Pencil, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, SkillDot } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Select, Textarea, Toggle } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingGrid } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError, cn, useFetch } from "@/lib/client";
import { SKILL_COLOR_HEX } from "@/lib/constants";
import type { NoteDTO, SkillDTO } from "@/lib/types";

interface NotesResponse {
  notes: NoteDTO[];
  topics: { topic: string; count: number }[];
}

/** Wrap search matches in <mark> for quick scanning. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${esc})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded bg-amber-300/60 px-0.5 text-inherit dark:bg-amber-500/40">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function NotesPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [topic, setTopic] = useState("ALL");
  const [skillId, setSkillId] = useState("ALL");
  const [interview, setInterview] = useState(false);
  const [viewing, setViewing] = useState<NoteDTO | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; note?: NoteDTO; template?: Partial<NoteDTO> }>({ open: false });

  // Plan habit: 5-line recall every night (10:45–11:00 PM)
  const openRecall = () =>
    setEditor({
      open: true,
      template: {
        title: `Recall · ${format(new Date(), "EEE d MMM")}`,
        topic: "Daily Recall",
        tags: "recall",
        content: [
          "1. What I learned today:",
          "2. In my own words:",
          "3. Real-life analogy:",
          "4. What I built / committed:",
          "5. Tomorrow's first task:",
        ].join("\n"),
      },
    });
  const skills = useFetch<SkillDTO[]>("/api/skills");
  const { toast, confirm } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ q: debounced, topic, skillId, interview: interview ? "1" : "" });
  const { data, error, loading, reload, hardReload } = useFetch<NotesResponse>(`/api/notes?${params}`);
  const allTopics = useFetch<NotesResponse>("/api/notes");

  const refresh = () => {
    reload();
    allTopics.reload();
  };

  const togglePin = async (n: NoteDTO) => {
    try {
      await api(`/api/notes/${n.id}`, { method: "PATCH", body: { pinned: !n.pinned } });
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const remove = async (n: NoteDTO) => {
    if (!(await confirm({ title: "Delete note?", message: `"${n.title}" will be permanently removed.`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await api(`/api/notes/${n.id}`, { method: "DELETE" });
      setViewing(null);
      toast("Note deleted");
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const topics = allTopics.data?.topics ?? [];

  return (
    <div>
      <PageHeader
        emoji="📝"
        title="Notes"
        subtitle="Your second brain for concepts, patterns and interview answers."
        actions={
          <>
            <a href="/api/notes/export" download>
              <Button variant="secondary" type="button">
                <Download className="h-4 w-4" /> interview-notes.md
              </Button>
            </a>
            <Button variant="soft" onClick={openRecall}>
              <Moon className="h-4 w-4" /> Daily recall
            </Button>
            <Button onClick={() => setEditor({ open: true })}>
              <Plus className="h-4 w-4" /> New note
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-9" placeholder="Search titles, content and tags…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input lg:w-52" value={skillId} onChange={(e) => setSkillId(e.target.value)} aria-label="Filter by skill">
          <option value="ALL">All skills</option>
          {(skills.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="flex items-center">
          <Toggle checked={interview} onChange={setInterview} label="Interview prep only" />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={() => setTopic("ALL")} className={cn("chip py-1.5", topic === "ALL" ? "bg-brand-500 text-white" : "bg-black/5 dark:bg-white/10")}>
          All topics
        </button>
        {topics.map((t) => (
          <button key={t.topic} onClick={() => setTopic(t.topic)} className={cn("chip py-1.5", topic === t.topic ? "bg-brand-500 text-white" : "bg-black/5 dark:bg-white/10")}>
            {t.topic} <span className="opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      {loading && !data ? (
        <LoadingGrid count={6} className="h-48" />
      ) : error ? (
        <ErrorState message={error} onRetry={hardReload} />
      ) : !data?.notes.length ? (
        <EmptyState
          emoji="📝"
          title={debounced ? "No notes match your search" : "No notes yet"}
          description={debounced ? "Try a different keyword or clear filters." : "Capture concepts while they're fresh — future you will thank you."}
          action={!debounced && <Button onClick={() => setEditor({ open: true })}>Write a note</Button>}
        />
      ) : (
        <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {data.notes.map((n, i) => {
            const color = n.skill ? SKILL_COLOR_HEX[n.skill.color] : undefined;
            return (
              <div
                key={n.id}
                onClick={() => setViewing(n)}
                className="card card-hover mb-4 cursor-pointer break-inside-avoid p-5 animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms`, borderTop: color ? `3px solid ${color}` : undefined }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">
                    <Highlight text={n.title} query={debounced} />
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(n);
                    }}
                    aria-label={n.pinned ? "Unpin" : "Pin"}
                    className="shrink-0"
                  >
                    {n.pinned ? <Pin className="h-4 w-4 fill-brand-500 text-brand-500" /> : <Pin className="h-4 w-4 text-zinc-300 hover:text-brand-500 dark:text-zinc-600" />}
                  </button>
                </div>
                <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm text-ink-soft dark:text-zinc-400">
                  <Highlight text={n.content} query={debounced} />
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge>{n.topic}</Badge>
                  {n.skill && (
                    <Badge>
                      <SkillDot color={n.skill.color} /> {n.skill.name}
                    </Badge>
                  )}
                  {n.isInterview && (
                    <Badge className="bg-brand-500/10 text-brand-700 dark:text-brand-300">
                      <Mic className="h-3 w-3" /> interview
                    </Badge>
                  )}
                  {n.tags
                    .split(",")
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((t) => (
                      <span key={t} className="text-[11px] text-ink-soft">#{t}</span>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <Modal
          open
          size="lg"
          onClose={() => setViewing(null)}
          title={viewing.title}
          footer={
            <div className="flex w-full items-center gap-2">
              <span className="text-xs text-ink-soft">Updated {format(parseISO(viewing.updatedAt), "MMM d, yyyy · h:mm a")}</span>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => remove(viewing)} className="hover:text-rose-500" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="secondary" onClick={() => togglePin(viewing).then(() => setViewing({ ...viewing, pinned: !viewing.pinned }))}>
                  {viewing.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />} {viewing.pinned ? "Unpin" : "Pin"}
                </Button>
                <Button
                  onClick={() => {
                    setEditor({ open: true, note: viewing });
                    setViewing(null);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </div>
            </div>
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <Badge>{viewing.topic}</Badge>
            {viewing.skill && (
              <Badge>
                <SkillDot color={viewing.skill.color} /> {viewing.skill.name}
              </Badge>
            )}
            {viewing.isInterview && <Badge className="bg-brand-500/10 text-brand-700 dark:text-brand-300">interview prep</Badge>}
            <div className="ml-auto">
              <CopyButton text={viewing.content} className="bg-black/5 text-ink-soft hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300" />
            </div>
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
            <Highlight text={viewing.content} query={debounced} />
          </div>
        </Modal>
      )}

      {editor.open && (
        <NoteEditor
          note={editor.note}
          template={editor.template}
          skills={skills.data ?? []}
          topics={topics.map((t) => t.topic)}
          onClose={() => setEditor({ open: false })}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function NoteEditor({
  note,
  template,
  skills,
  topics,
  onClose,
  onSaved,
}: {
  note?: NoteDTO;
  template?: Partial<NoteDTO>;
  skills: SkillDTO[];
  topics: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: note?.title ?? template?.title ?? "",
    content: note?.content ?? template?.content ?? "",
    topic: note?.topic ?? template?.topic ?? "General",
    tags: (note?.tags ?? template?.tags ?? "").split(",").filter(Boolean).join(", "),
    pinned: note?.pinned ?? false,
    isInterview: note?.isInterview ?? false,
    skillId: String(note?.skillId ?? ""),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.title.trim()) local.title = "Give the note a title";
    if (!form.content.trim()) local.content = "Write something in the note";
    if (!form.topic.trim()) local.topic = "Topic is required";
    setErrors(local);
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      await api(note ? `/api/notes/${note.id}` : "/api/notes", { method: note ? "PUT" : "POST", body: { ...form, skillId: form.skillId || null } });
      toast(note ? "Note saved" : "Note created 📝");
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
      size="lg"
      onClose={onClose}
      title={note ? "Edit note" : "New note"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="note-form" loading={saving}>Save note</Button>
        </>
      }
    >
      <form id="note-form" onSubmit={submit} className="space-y-4">
        <Input label="Title" name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={errors.title} autoFocus />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="topic">Topic</label>
            <input id="topic" list="note-topics" className={cn("input", errors.topic && "border-rose-400")} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            <datalist id="note-topics">
              {Array.from(new Set([...topics, "JavaScript", "React", "Next.js", "Node.js", "SQL", "DSA", "System Design", "Interview", "Planning"])).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {errors.topic && <p className="mt-1 text-xs text-rose-500">{errors.topic}</p>}
          </div>
          <Select label="Skill" name="skillId" value={form.skillId} onChange={(e) => setForm({ ...form, skillId: e.target.value })} options={[{ value: "", label: "— None —" }, ...skills.map((s) => ({ value: String(s.id), label: s.name }))]} />
          <Input label="Tags" name="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="hooks, async" hint="Comma separated" />
        </div>
        <Textarea
          label="Content"
          name="content"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          error={errors.content}
          className="[&_textarea]:min-h-[260px] [&_textarea]:font-mono [&_textarea]:text-[13px] [&_textarea]:leading-6"
        />
        <div className="flex flex-wrap gap-6">
          <Toggle checked={form.isInterview} onChange={(v) => setForm({ ...form, isInterview: v })} label="Interview prep" />
          <Toggle checked={form.pinned} onChange={(v) => setForm({ ...form, pinned: v })} label="Pin to top" />
        </div>
      </form>
    </Modal>
  );
}
