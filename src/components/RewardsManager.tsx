"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingGrid } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { RewardCard } from "@/components/dashboard/Widgets";
import { api, ApiClientError, useFetch } from "@/lib/client";
import type { RewardDTO } from "@/lib/types";

/** Dream rewards (MacBook, iPhone, Apple Watch…) with create / edit / delete / claim. */
export function RewardsManager({ onChanged }: { onChanged?: () => void }) {
  const { data, error, loading, reload, hardReload } = useFetch<{ xp: number; rewards: RewardDTO[] }>("/api/rewards");
  const [editing, setEditing] = useState<{ open: boolean; reward?: RewardDTO }>({ open: false });
  const { toast, celebrate, confirm } = useToast();

  const claim = async (r: RewardDTO) => {
    try {
      await api(`/api/rewards/${r.id}`, { method: "PATCH", body: { claimed: true } });
      celebrate(`You earned it: ${r.emoji} ${r.title}! Enjoy — you worked for this. 🎉`);
      reload();
      onChanged?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't claim", "error");
    }
  };

  const remove = async (r: RewardDTO) => {
    if (!(await confirm({ title: `Remove ${r.title}?`, message: "This deletes the reward milestone (your XP stays).", confirmLabel: "Remove", danger: true }))) return;
    try {
      await api(`/api/rewards/${r.id}`, { method: "DELETE" });
      toast("Reward removed");
      reload();
      onChanged?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  if (loading && !data) return <LoadingGrid count={3} className="h-56" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={hardReload} />;

  return (
    <div>
      {data.rewards.length === 0 ? (
        <EmptyState emoji="🎁" title="No dream rewards yet" description="Add something worth working for — a MacBook, a trip, a new phone." action={<Button onClick={() => setEditing({ open: true })}>Add a reward</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.rewards.map((r, i) => (
            <RewardCard
              key={r.id}
              reward={r}
              index={i}
              onClaim={claim}
              actions={
                <>
                  <button onClick={() => setEditing({ open: true, reward: r })} className="rounded-lg p-1.5 hover:bg-white/20" aria-label="Edit reward">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(r)} className="rounded-lg p-1.5 hover:bg-white/20" aria-label="Delete reward">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              }
            />
          ))}
          <button
            onClick={() => setEditing({ open: true })}
            className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-black/10 text-ink-soft transition hover:border-brand-500 hover:text-brand-600 dark:border-white/10"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-semibold">Add dream reward</span>
          </button>
        </div>
      )}
      {editing.open && (
        <RewardForm
          reward={editing.reward}
          onClose={() => setEditing({ open: false })}
          onSaved={() => {
            reload();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}

function RewardForm({ reward, onClose, onSaved }: { reward?: RewardDTO; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: reward?.title ?? "",
    emoji: reward?.emoji ?? "🎁",
    description: reward?.description ?? "",
    targetXp: String(reward?.targetXp ?? 2000),
  });
  const EMOJIS = ["💻", "📱", "⌚️", "🚗", "🎧", "✈️", "🎮", "📷", "❤️", "🎁"];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.title.trim()) local.title = "Name your reward";
    if (!Number(form.targetXp) || Number(form.targetXp) < 10) local.targetXp = "At least 10 XP";
    setErrors(local);
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      await api(reward ? `/api/rewards/${reward.id}` : "/api/rewards", { method: reward ? "PUT" : "POST", body: { ...form, targetXp: Number(form.targetXp) } });
      toast(reward ? "Reward updated" : "Reward added — now go earn it! 🔥");
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
      title={reward ? "Edit reward" : "New dream reward"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="reward-form" loading={saving}>Save</Button>
        </>
      }
    >
      <form id="reward-form" onSubmit={submit} className="space-y-4">
        <div>
          <div className="label">Icon</div>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setForm({ ...form, emoji: em })}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition ${form.emoji === em ? "bg-brand-500/20 ring-2 ring-brand-500" : "bg-black/5 dark:bg-white/10"}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
        <Input label="Reward" name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={errors.title} placeholder="MacBook Pro" />
        <Input label="Why it matters" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input label="XP needed" name="targetXp" type="number" min={10} step={50} value={form.targetXp} onChange={(e) => setForm({ ...form, targetXp: e.target.value })} error={errors.targetXp} hint="Roughly: 4h study/day ≈ 24 XP + tasks + problems. ~6,000 XP ≈ a strong 12-week plan." />
      </form>
    </Modal>
  );
}
