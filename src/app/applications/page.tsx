"use client";
import { useMemo, useState } from "react";
import { format, isBefore, parseISO, startOfDay, startOfWeek } from "date-fns";
import { Briefcase, CalendarClock, ExternalLink, Handshake, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressRing";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError, cn, useFetch } from "@/lib/client";
import { APP_CHANNELS, APP_STATUS_STYLES, APP_STATUSES, COMPANY_TYPES, WEEKLY_APP_TARGETS } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import type { JobApplicationDTO } from "@/lib/types";

const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const TYPE_LABEL: Record<string, string> = { SERVICE: "Service / IT", STARTUP: "Startup / SMB", PRODUCT: "Product co." };

export default function ApplicationsPage() {
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [editor, setEditor] = useState<{ open: boolean; app?: JobApplicationDTO }>({ open: false });
  const all = useFetch<JobApplicationDTO[]>("/api/applications");
  const { toast, celebrate, confirm } = useToast();

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (all.data ?? []).filter(
      (a) =>
        (status === "ALL" || a.status === status) &&
        (!term || a.company.toLowerCase().includes(term) || a.role.toLowerCase().includes(term) || (a.notes ?? "").toLowerCase().includes(term)),
    );
  }, [all.data, status, q]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeek = (all.data ?? []).filter((a) => a.status !== "WISHLIST" && parseISO(a.appliedAt) >= weekStart);
  const counts = Object.fromEntries(APP_STATUSES.map((s) => [s, (all.data ?? []).filter((a) => a.status === s).length]));
  const offers = (all.data ?? []).filter((a) => a.status === "OFFER" && a.offeredLpa).sort((a, b) => (b.offeredLpa ?? 0) - (a.offeredLpa ?? 0));

  const changeStatus = async (a: JobApplicationDTO, next: string) => {
    all.setData((prev) => prev?.map((x) => (x.id === a.id ? { ...x, status: next } : x)) ?? null);
    try {
      await api(`/api/applications/${a.id}`, { method: "PATCH", body: { status: next } });
      if (next === "OFFER") celebrate(`Offer from ${a.company}! 🎉 Now use it to negotiate the next one.`);
      else if (next === "INTERVIEWING") toast(`Interview stage at ${a.company} — prep your STAR stories 💪`);
      else if (next === "REJECTED") toast("Rejections are data, not verdicts. Note what they asked and keep going.", "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error");
      all.reload();
    }
  };

  const remove = async (a: JobApplicationDTO) => {
    if (!(await confirm({ title: "Delete application?", message: `${a.company} — ${a.role}`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await api(`/api/applications/${a.id}`, { method: "DELETE" });
      toast("Application deleted");
      all.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  return (
    <div>
      <PageHeader
        emoji="💼"
        title="Job Applications"
        subtitle="Apply early (from week 6). Aim for 2–3 offers landing in the same 2–3 weeks."
        actions={
          <Button onClick={() => setEditor({ open: true })}>
            <Plus className="h-4 w-4" /> Add application
          </Button>
        }
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={<Briefcase className="h-4 w-4" />} title="This week vs. plan targets" subtitle={`${thisWeek.length} applications since Monday`} />
          <div className="grid gap-4 sm:grid-cols-2">
            {WEEKLY_APP_TARGETS.map((t) => {
              const n = thisWeek.filter((a) => t.channels.includes(a.channel)).length;
              return (
                <div key={t.label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">{t.label}</span>
                    <span className={cn("font-semibold", n >= t.target && "text-emerald-600 dark:text-emerald-400")}>
                      {n}/{t.target}
                    </span>
                  </div>
                  <ProgressBar value={(n / t.target) * 100} color={n >= t.target ? "#30d158" : undefined} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardTitle icon={<Handshake className="h-4 w-4" />} title="Negotiation" />
          {offers.length ? (
            <div className="space-y-2 text-sm">
              <p>
                Best offer: <b>{offers[0].offeredLpa} LPA</b> at {offers[0].company}.
              </p>
              <p className="text-ink-soft dark:text-zinc-400">
                Use it politely: &ldquo;I have an offer at {offers[0].offeredLpa} LPA; I prefer your company — can you get closer to my expectation?&rdquo; Compare fixed pay, not just CTC.
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-soft dark:text-zinc-400">
              Give a market-based number, not a % hike: &ldquo;For 3-year full stack roles I&apos;m looking for 12–14 LPA.&rdquo; Try to get their budget first.
            </p>
          )}
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStatus("ALL")} className={cn("chip py-1.5", status === "ALL" ? "bg-brand-500 text-white" : "bg-black/5 dark:bg-white/10")}>
            All <span className="opacity-60">{all.data?.length ?? 0}</span>
          </button>
          {APP_STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cn("chip py-1.5", status === s ? "bg-brand-500 text-white" : APP_STATUS_STYLES[s])}>
              {label(s)} <span className="opacity-60">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:ml-auto lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-9" placeholder="Search company or role…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {all.loading && !all.data ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : all.error ? (
        <ErrorState message={all.error} onRetry={all.hardReload} />
      ) : !list.length ? (
        <EmptyState
          emoji="💼"
          title={all.data?.length ? "Nothing matches this filter" : "No applications yet"}
          description="Weeks 6–8: service companies and smaller startups (treat interviews as paid practice). Weeks 8–11: your target startups and product companies."
          action={!all.data?.length && <Button onClick={() => setEditor({ open: true })}>Add your first application</Button>}
        />
      ) : (
        <div className="space-y-2">
          {list.map((a, i) => {
            const stepDue = a.nextStepDate && isBefore(parseISO(a.nextStepDate), startOfDay(new Date()));
            return (
              <div key={a.id} className="card group flex flex-col gap-3 p-4 animate-fade-up sm:flex-row sm:items-center" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-black text-white">
                  {a.company.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{a.company}</span>
                    <span className="text-sm text-ink-soft">{a.role}</span>
                    {a.link && (
                      <a href={a.link} target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-300" aria-label="Open job link">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                    <Badge>{TYPE_LABEL[a.companyType]}</Badge>
                    <Badge>{a.channel}</Badge>
                    <span>Applied {format(parseISO(a.appliedAt), "MMM d")}</span>
                    {a.offeredLpa ? <b className="text-emerald-600 dark:text-emerald-400">Offer {a.offeredLpa} LPA</b> : a.expectedLpa ? <span>Expecting {a.expectedLpa} LPA</span> : null}
                    {a.nextStep && (
                      <span className={cn("inline-flex items-center gap-1", stepDue && "font-semibold text-rose-500")}>
                        <CalendarClock className="h-3 w-3" /> {a.nextStep}
                        {a.nextStepDate && ` · ${format(parseISO(a.nextStepDate), "MMM d")}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={a.status}
                    onChange={(e) => changeStatus(a, e.target.value)}
                    className={cn("rounded-xl border-0 px-3 py-2 text-xs font-semibold outline-none", APP_STATUS_STYLES[a.status])}
                    aria-label="Status"
                  >
                    {APP_STATUSES.map((s) => (
                      <option key={s} value={s}>{label(s)}</option>
                    ))}
                  </select>
                  <Button size="icon" variant="ghost" onClick={() => setEditor({ open: true, app: a })} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(a)} aria-label="Delete" className="hover:text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editor.open && <ApplicationForm app={editor.app} onClose={() => setEditor({ open: false })} onSaved={all.reload} />}
    </div>
  );
}

function ApplicationForm({ app, onClose, onSaved }: { app?: JobApplicationDTO; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    company: app?.company ?? "",
    role: app?.role ?? "Full Stack Developer (MERN)",
    companyType: app?.companyType ?? "STARTUP",
    channel: app?.channel ?? "LinkedIn",
    status: app?.status ?? "APPLIED",
    link: app?.link ?? "",
    contact: app?.contact ?? "",
    expectedLpa: app?.expectedLpa != null ? String(app.expectedLpa) : "",
    offeredLpa: app?.offeredLpa != null ? String(app.offeredLpa) : "",
    appliedAt: toDateInput(app?.appliedAt ?? new Date()),
    nextStep: app?.nextStep ?? "",
    nextStepDate: toDateInput(app?.nextStepDate),
    notes: app?.notes ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.company.trim()) local.company = "Company is required";
    if (!form.role.trim()) local.role = "Role is required";
    if (form.link && !/^https?:\/\//.test(form.link)) local.link = "Link must start with http:// or https://";
    setErrors(local);
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      await api(app ? `/api/applications/${app.id}` : "/api/applications", { method: app ? "PUT" : "POST", body: form });
      toast(app ? "Application updated" : "Application added — one step closer 🚀");
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
      title={app ? "Edit application" : "New application"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="app-form" loading={saving}>Save</Button>
        </>
      }
    >
      <form id="app-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Company" name="company" value={form.company} onChange={set("company")} error={errors.company} autoFocus />
          <Input label="Role" name="role" value={form.role} onChange={set("role")} error={errors.role} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Select label="Company type" name="companyType" value={form.companyType} onChange={set("companyType")} options={COMPANY_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
          <Select label="Channel" name="channel" value={form.channel} onChange={set("channel")} options={APP_CHANNELS.map((c) => ({ value: c, label: c }))} />
          <Select label="Status" name="status" value={form.status} onChange={set("status")} options={APP_STATUSES.map((s) => ({ value: s, label: label(s) }))} />
          <Input label="Applied on" name="appliedAt" type="date" value={form.appliedAt} onChange={set("appliedAt")} error={errors.appliedAt} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Job link" name="link" value={form.link} onChange={set("link")} error={errors.link} placeholder="https://…" />
          <Input label="Contact / referrer" name="contact" value={form.contact} onChange={set("contact")} placeholder="Name, LinkedIn…" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input label="Expected (LPA)" name="expectedLpa" type="number" step="0.1" min={0} value={form.expectedLpa} onChange={set("expectedLpa")} error={errors.expectedLpa} />
          <Input label="Offered (LPA)" name="offeredLpa" type="number" step="0.1" min={0} value={form.offeredLpa} onChange={set("offeredLpa")} error={errors.offeredLpa} />
          <Input label="Next step" name="nextStep" value={form.nextStep} onChange={set("nextStep")} placeholder="Machine coding round" />
          <Input label="Next step date" name="nextStepDate" type="date" value={form.nextStepDate} onChange={set("nextStepDate")} />
        </div>
        <Textarea label="Notes" name="notes" value={form.notes} onChange={set("notes")} placeholder="What they asked, how it went, what to prepare next…" />
      </form>
    </Modal>
  );
}
