"use client";
import { useEffect, useState } from "react";
import { Check, Database, Download, Monitor, Moon, Palette, Rocket, Sun, Target, User } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/components/layout/SettingsProvider";
import { RewardsManager } from "@/components/RewardsManager";
import { api, ApiClientError, cn } from "@/lib/client";
import { ACCENT_HEX, ACCENTS, WEEKDAYS } from "@/lib/constants";
import { minutesToLabel, toDateInput } from "@/lib/dates";
import { dayTargetsOf } from "@/lib/targets";
import type { SettingsDTO } from "@/lib/types";

export default function SettingsPage() {
  const { settings, setSettings, refreshSettings } = useSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<null | {
    name: string;
    mainGoal: string;
    dayTargets: string[]; // minutes, Sunday first
    dailyLimitMinutes: string;
    streakMinMinutes: string;
    dailyDsaTarget: string;
    planStartDate: string;
    planWeeks: string;
    theme: SettingsDTO["theme"];
    accent: string;
  }>(null);

  useEffect(() => {
    if (!settings || form) return;
    setForm({
      name: settings.name,
      mainGoal: settings.mainGoal,
      dayTargets: dayTargetsOf(settings).map(String),
      dailyLimitMinutes: String(settings.dailyLimitMinutes),
      streakMinMinutes: String(settings.streakMinMinutes),
      dailyDsaTarget: String(settings.dailyDsaTarget),
      planStartDate: toDateInput(settings.planStartDate),
      planWeeks: String(settings.planWeeks),
      theme: settings.theme,
      accent: settings.accent,
    });
  }, [settings, form]);

  if (!settings || !form)
    return settings === null ? (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    ) : (
      <ErrorState message="Couldn't load settings" onRetry={refreshSettings} />
    );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  // Live preview for theme/accent
  const preview = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    setSettings({ ...settings, theme: next.theme, accent: next.accent });
  };

  const setDay = (d: number, v: string) => setForm({ ...form, dayTargets: form.dayTargets.map((x, i) => (i === d ? v : x)) });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const saved = await api<SettingsDTO>("/api/settings", {
        method: "PUT",
        body: {
          ...form,
          dayTargets: form.dayTargets.map((v) => Number(v) || 0),
          dailyLimitMinutes: Number(form.dailyLimitMinutes),
          streakMinMinutes: Number(form.streakMinMinutes),
          dailyDsaTarget: Number(form.dailyDsaTarget),
          planWeeks: Number(form.planWeeks),
        },
      });
      setSettings(saved);
      toast("Settings saved ✨");
    } catch (err) {
      if (err instanceof ApiClientError) setErrors(err.fields);
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const weeklyHours = form.dayTargets.reduce((a, v) => a + (Number(v) || 0), 0) / 60;

  return (
    <div>
      <PageHeader emoji="⚙️" title="Settings" subtitle="Tune NavTracker to your plan, your rhythm and your style." />

      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardTitle icon={<User className="h-4 w-4" />} title="Profile" />
            <div className="space-y-4">
              <Input label="Your name" name="name" value={form.name} onChange={set("name")} error={errors.name} />
              <Input label="Main goal" name="mainGoal" value={form.mainGoal} onChange={set("mainGoal")} error={errors.mainGoal} hint="Shown in the sidebar as your north star." />
            </div>
          </Card>

          <Card>
            <CardTitle icon={<Rocket className="h-4 w-4" />} title="Study plan" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Plan start" name="planStartDate" type="date" value={form.planStartDate} onChange={set("planStartDate")} error={errors.planStartDate} />
              <Input label="Plan length (weeks)" name="planWeeks" type="number" min={1} max={104} value={form.planWeeks} onChange={set("planWeeks")} error={errors.planWeeks} />
            </div>
            <p className="mt-4 text-xs text-ink-soft">Rest days are set below: give a day 0 minutes and it never breaks your streak.</p>
          </Card>
        </div>

        <Card>
          <CardTitle icon={<Target className="h-4 w-4" />} title="Study targets" subtitle={`≈ ${weeklyHours.toFixed(1)} hours per week · 0 = rest day`} />
          <div className="label">Minutes per day</div>
          <div className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const v = Number(form.dayTargets[d]) || 0;
              return (
                <div key={d} className={cn("rounded-2xl p-2.5 text-center transition", v > 0 ? "bg-brand-500/10" : "bg-black/[0.04] dark:bg-white/5")}>
                  <div className="text-xs font-bold">{WEEKDAYS[d]}</div>
                  <input
                    type="number"
                    min={0}
                    max={960}
                    step={15}
                    value={form.dayTargets[d]}
                    onChange={(e) => setDay(d, e.target.value)}
                    className="input mt-1.5 px-1 text-center"
                    aria-label={`${WEEKDAYS[d]} target in minutes`}
                  />
                  <div className="mt-1 text-[11px] text-ink-soft">{v ? minutesToLabel(v) : "Rest"}</div>
                </div>
              );
            })}
          </div>
          {errors.dayTargets && <p className="-mt-3 mb-3 text-xs text-rose-500">{errors.dayTargets}</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Daily limit (min)" name="dailyLimitMinutes" type="number" min={30} step={15} value={form.dailyLimitMinutes} onChange={set("dailyLimitMinutes")} error={errors.dailyLimitMinutes} hint="We'll nudge you to rest beyond this" />
            <Input label="Streak minimum (min)" name="streakMinMinutes" type="number" min={5} step={5} value={form.streakMinMinutes} onChange={set("streakMinMinutes")} error={errors.streakMinMinutes} hint="Minutes for a day to count" />
            <Input label="DSA problems / day" name="dailyDsaTarget" type="number" min={0} max={30} value={form.dailyDsaTarget} onChange={set("dailyDsaTarget")} error={errors.dailyDsaTarget} hint="Blue activity ring" />
          </div>
        </Card>

        <Card>
          <CardTitle icon={<Palette className="h-4 w-4" />} title="Appearance" subtitle="Changes preview instantly — save to keep them." />
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="label">Theme</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["light", "Light", Sun],
                  ["dark", "Dark", Moon],
                  ["system", "System", Monitor],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => preview({ theme: value })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-sm font-semibold transition",
                      form.theme === value ? "border-brand-500 bg-brand-500/10" : "border-transparent bg-black/[0.04] dark:bg-white/5",
                    )}
                  >
                    <Icon className="h-5 w-5" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label">Accent color</div>
              <div className="flex flex-wrap gap-3">
                {ACCENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => preview({ accent: a })}
                    className="relative h-12 w-12 rounded-2xl shadow-md transition hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${ACCENT_HEX[a].main}, ${ACCENT_HEX[a].alt})` }}
                    aria-label={a}
                    title={a}
                  >
                    {form.accent === a && <Check className="absolute inset-0 m-auto h-5 w-5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="sticky bottom-20 z-20 flex justify-end lg:bottom-4">
          <Button type="submit" size="lg" loading={saving} className="shadow-2xl">
            Save settings
          </Button>
        </div>
      </form>

      <div className="mt-8">
        <h2 className="mb-3 text-xl font-bold tracking-tight">Dream rewards</h2>
        <RewardsManager />
      </div>

      <Card className="mt-8">
        <CardTitle icon={<Database className="h-4 w-4" />} title="Your data" subtitle="Everything lives in a local SQLite file on your Mac — no cloud, no accounts." />
        <div className="space-y-3 text-sm text-ink-soft dark:text-zinc-400">
          <p>
            Database file: <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">prisma/dev.db</code>. Back it up by copying that file, or download a JSON export:
          </p>
          <a href="/api/export" download>
            <Button type="button" variant="secondary">
              <Download className="h-4 w-4" /> Export backup (JSON)
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
