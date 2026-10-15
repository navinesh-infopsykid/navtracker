import { z } from "zod";
import {
  ACCENTS,
  APP_STATUSES,
  COMPANY_TYPES,
  DIFFICULTIES,
  DSA_STATUSES,
  GOAL_STATUSES,
  PRIORITIES,
  SKILL_COLORS,
  THEMES,
  TIMEFRAMES,
} from "./constants";
import { fromDateInput } from "./dates";

// ---------- small helpers ----------

const trimmed = (max: number, label = "This field") =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long (max ${max})`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Too long (max ${max} characters)`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** Accepts "yyyy-MM-dd", "", null or undefined. Returns Date | null. */
const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date")
  .transform((v) => (v ? fromDateInput(v) : null));

const requiredDate = z
  .string({ required_error: "Date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .transform((v) => fromDateInput(v));

const optionalId = z
  .union([z.number().int().positive(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  });

// ---------- Goals & tasks ----------

export const goalSchema = z.object({
  title: trimmed(140, "Title"),
  description: optionalText(2000),
  timeframe: z.enum(TIMEFRAMES),
  category: z.string().trim().max(40).default("General"),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  status: z.enum(GOAL_STATUSES).default("ACTIVE"),
  deadline: optionalDate,
  parentId: optionalId,
});

export const taskSchema = z.object({
  title: trimmed(160, "Title"),
  notes: optionalText(2000),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  estimatedMinutes: z.coerce
    .number()
    .int("Whole minutes only")
    .min(5, "At least 5 minutes")
    .max(720, "Keep tasks under 12 hours — split it up"),
  deadline: optionalDate,
  goalId: optionalId,
  completed: z.boolean().optional(),
});

// ---------- Study sessions ----------

export const sessionSchema = z.object({
  date: requiredDate,
  minutes: z.coerce.number().int().min(1, "At least 1 minute").max(720, "Max 12 hours per session"),
  topic: trimmed(120, "Topic"),
  notes: optionalText(2000),
  focus: z.coerce.number().int().min(1).max(5).default(4),
  skillId: optionalId,
});

// ---------- DSA ----------

export const dsaSchema = z.object({
  title: trimmed(160, "Problem title"),
  url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\//.test(v), "Link must start with http:// or https://")
    .transform((v) => (v ? v : null)),
  platform: z.string().trim().min(1).max(40),
  topic: trimmed(60, "Topic"),
  difficulty: z.enum(DIFFICULTIES),
  status: z.enum(DSA_STATUSES).default("SOLVED"),
  language: z.string().trim().min(1).max(30),
  code: optionalText(50000),
  approach: optionalText(5000),
  timeComplexity: optionalText(60),
  spaceComplexity: optionalText(60),
  starred: z.boolean().default(false),
  solvedAt: requiredDate,
  nextRevision: optionalDate,
});

// ---------- Skills ----------

export const skillSchema = z.object({
  name: trimmed(60, "Skill name"),
  category: z.string().trim().min(1).max(40),
  level: z.coerce.number().int().min(0).max(100),
  color: z.enum(SKILL_COLORS).default("violet"),
  description: optionalText(500),
  notes: optionalText(10000),
});

export const checklistSchema = z.object({
  text: trimmed(200, "Checklist item"),
  skillId: z.coerce.number().int().positive(),
});

export const questionSchema = z.object({
  question: trimmed(500, "Question"),
  answer: optionalText(10000),
  difficulty: z.enum(DIFFICULTIES).default("MEDIUM"),
  confidence: z.coerce.number().int().min(1).max(5).default(2),
  skillId: optionalId,
});

// ---------- Notes ----------

export const noteSchema = z.object({
  title: trimmed(160, "Title"),
  content: z.string().trim().min(1, "Write something in the note").max(100000),
  topic: z.string().trim().min(1, "Topic is required").max(60),
  tags: z
    .string()
    .max(300)
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .filter((t, i, arr) => arr.indexOf(t) === i)
        .join(","),
    ),
  pinned: z.boolean().default(false),
  isInterview: z.boolean().default(false),
  skillId: optionalId,
});

// ---------- Rewards & settings ----------

export const rewardSchema = z.object({
  title: trimmed(80, "Reward"),
  emoji: z.string().trim().min(1).max(8).default("🎁"),
  description: optionalText(300),
  targetXp: z.coerce.number().int().min(10, "At least 10 XP").max(1_000_000),
});

export const settingsSchema = z
  .object({
    name: trimmed(40, "Name"),
    // minutes for each weekday, Sunday first
    dayTargets: z
      .array(z.coerce.number().int().min(0, "Can't be negative").max(960, "Max 16 hours"))
      .length(7, "Give a target for all 7 days")
      .refine((d) => d.some((m) => m > 0), "At least one day needs a study target"),
    dailyLimitMinutes: z.coerce.number().int().min(30).max(1200),
    streakMinMinutes: z.coerce.number().int().min(5).max(600),
    dailyDsaTarget: z.coerce.number().int().min(0).max(30),
    planStartDate: requiredDate,
    planWeeks: z.coerce.number().int().min(1).max(104),
    mainGoal: trimmed(160, "Main goal"),
    theme: z.enum(THEMES),
    accent: z.enum(ACCENTS),
  })
  .refine((s) => s.dailyLimitMinutes >= Math.max(...s.dayTargets), {
    message: "Daily limit must be at least your biggest day's target",
    path: ["dailyLimitMinutes"],
  })
  .transform(({ dayTargets, ...rest }) => {
    const active = dayTargets.filter((m) => m > 0);
    return {
      ...rest,
      dayTargets: dayTargets.join(","),
      // kept in sync for older parts of the app
      workingDays: dayTargets.map((m, i) => (m > 0 ? i : -1)).filter((i) => i >= 0).join(","),
      dailyTargetMinutes: Math.round(active.reduce((a, b) => a + b, 0) / active.length),
    };
  });

// ---------- Job applications ----------

const optionalLpa = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number({ invalid_type_error: "Enter a number in LPA" }).min(0).max(500, "That's a lot of LPA 😄").nullable(),
);

export const applicationSchema = z.object({
  company: trimmed(120, "Company"),
  role: trimmed(120, "Role"),
  companyType: z.enum(COMPANY_TYPES),
  channel: z.string().trim().min(1).max(40),
  status: z.enum(APP_STATUSES),
  link: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\//.test(v), "Link must start with http:// or https://")
    .transform((v) => (v ? v : null)),
  contact: optionalText(200),
  expectedLpa: optionalLpa,
  offeredLpa: optionalLpa,
  appliedAt: requiredDate,
  nextStep: optionalText(200),
  nextStepDate: optionalDate,
  notes: optionalText(5000),
});
