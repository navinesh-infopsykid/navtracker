// Server-only: all dashboard / motivation calculations live here so the UI stays simple.
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  format,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { prisma } from "./prisma";
import { XP_RULES } from "./constants";
import { dayKey } from "./dates";
import { dayTargetsOf, targetFor, workingDaySet } from "./targets";
import type { Achievement, DashboardDTO, RecoveryPlan, RewardDTO, SettingsDTO } from "./types";

const WEEK_OPTS = { weekStartsOn: 1 as const }; // weeks start on Monday
export const XP_PER_LEVEL = 250;

export async function getSettings() {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export { dayTargetsOf, targetFor, workingDaySet };

// ---------- XP ----------

export async function computeXp() {
  const [minutesAgg, tasks, goals, dsa, checklist] = await Promise.all([
    prisma.studySession.aggregate({ _sum: { minutes: true } }),
    prisma.task.count({ where: { completed: true } }),
    prisma.goal.count({ where: { status: "COMPLETED" } }),
    prisma.dsaProblem.groupBy({ by: ["difficulty"], where: { status: "SOLVED" }, _count: true }),
    prisma.checklistItem.count({ where: { done: true } }),
  ]);
  const minutes = minutesAgg._sum.minutes ?? 0;
  let xp = Math.floor(minutes / XP_RULES.perStudyMinutes);
  xp += tasks * XP_RULES.task + goals * XP_RULES.goal + checklist * XP_RULES.checklistItem;
  for (const g of dsa) xp += (XP_RULES.dsa[g.difficulty] ?? 10) * g._count;
  return xp;
}

export function rewardsWithProgress(
  rewards: { id: number; title: string; emoji: string; description: string | null; targetXp: number; claimedAt: Date | null }[],
  xp: number,
): RewardDTO[] {
  return rewards.map((r) => ({
    ...r,
    claimedAt: r.claimedAt ? r.claimedAt.toISOString() : null,
    progress: Math.min(100, Math.round((xp / r.targetXp) * 100)),
    unlocked: xp >= r.targetXp,
    remainingXp: Math.max(0, r.targetXp - xp),
  }));
}

// ---------- Streaks ----------

function computeStreaks(byDay: Map<string, number>, working: Set<number>, minMinutes: number, firstDay: Date | null) {
  const now = new Date();
  // Current streak: today only counts if already reached; an unfinished today doesn't break it.
  let current = 0;
  let cursor = startOfDay(now);
  if ((byDay.get(dayKey(cursor)) ?? 0) < minMinutes) cursor = subDays(cursor, 1);
  for (let i = 0; i < 1000; i++) {
    const mins = byDay.get(dayKey(cursor)) ?? 0;
    const isWorking = working.has(cursor.getDay());
    if (mins >= minMinutes) current++;
    else if (isWorking) break; // a missed working day ends the streak; rest days are free
    if (firstDay && cursor < startOfDay(firstDay)) break;
    cursor = subDays(cursor, 1);
  }

  // Best streak across all history
  let best = 0;
  let run = 0;
  if (firstDay) {
    for (const d of eachDayOfInterval({ start: startOfDay(firstDay), end: startOfDay(now) })) {
      const mins = byDay.get(dayKey(d)) ?? 0;
      if (mins >= minMinutes) {
        run++;
        best = Math.max(best, run);
      } else if (working.has(d.getDay()) && dayKey(d) !== dayKey(now)) {
        run = 0;
      }
    }
  }
  return { current, best: Math.max(best, current) };
}

// ---------- Messages ----------

const ENCOURAGEMENTS = [
  "Small steps every day beat big bursts once a week. Show up today.",
  "You're not behind — you're building. Every session compounds.",
  "Interviews reward consistency. Today's practice is tomorrow's confidence.",
  "Future you, opening that MacBook box, is cheering for present you.",
  "Discipline is choosing what you want most over what you want now.",
  "One more problem. One more concept. That's how offers are earned.",
  "Progress, not perfection. Keep the rings moving.",
  "The best developers aren't geniuses — they just didn't quit.",
  "Focus on the next 25 minutes. That's all you need to win today.",
  "You started this plan for a reason. Honor it today.",
];

function pickEncouragement(seed: number, ctx: { todayPct: number; streak: number; behind: boolean }) {
  if (ctx.todayPct >= 100) return "Target smashed today! 🎉 Rest well — or bank a little extra for a lighter day.";
  if (ctx.streak >= 7) return `${ctx.streak}-day streak 🔥 You've built a real habit. Protect it today.`;
  if (ctx.behind) return "You slipped a little — that's normal. What matters is the next session, not the last one.";
  return ENCOURAGEMENTS[seed % ENCOURAGEMENTS.length];
}

function greetingFor(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}`;
}

// ---------- Dashboard ----------

export async function computeDashboard(): Promise<DashboardDTO> {
  const settings = await getSettings();
  const working = workingDaySet(settings);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, WEEK_OPTS);
  const monthStart = startOfMonth(now);

  const [sessions, tasks, goals, dsa, skills, notesCount, questions, rewards, xp] = await Promise.all([
    prisma.studySession.findMany({ orderBy: { date: "desc" }, include: { skill: { select: { id: true, name: true, color: true } } } }),
    prisma.task.findMany({ include: { goal: { select: { id: true, title: true } } } }),
    prisma.goal.findMany({ select: { id: true, title: true, timeframe: true, status: true, deadline: true, completedAt: true } }),
    prisma.dsaProblem.findMany({ select: { difficulty: true, status: true, solvedAt: true, nextRevision: true, revisionCount: true } }),
    prisma.skill.findMany({ include: { checklist: true } }),
    prisma.note.count(),
    prisma.interviewQuestion.findMany({ select: { confidence: true } }),
    prisma.reward.findMany({ orderBy: [{ sortOrder: "asc" }, { targetXp: "asc" }] }),
    computeXp(),
  ]);

  // Minutes per day
  const byDay = new Map<string, number>();
  const topicMap = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(s.date);
    byDay.set(k, (byDay.get(k) ?? 0) + s.minutes);
  }
  const sumRange = (from: Date, to: Date) =>
    sessions.filter((s) => s.date >= from && s.date <= to).reduce((a, s) => a + s.minutes, 0);

  const todayMinutes = byDay.get(dayKey(now)) ?? 0;
  const weekMinutes = sumRange(weekStart, todayEnd);
  const monthMinutes = sumRange(monthStart, todayEnd);
  const allMinutes = sessions.reduce((a, s) => a + s.minutes, 0);

  const targets = dayTargetsOf(settings);
  const tFor = (d: Date) => targets[d.getDay()];
  const sumTargets = (from: Date, to: Date) =>
    from > to ? 0 : eachDayOfInterval({ start: from, end: to }).reduce((a, d) => a + tFor(d), 0);
  const todayTarget = tFor(now);
  const weekTarget = sumTargets(weekStart, addDays(weekStart, 6));
  const monthEnd = addDays(startOfMonth(addDays(monthStart, 32)), -1);
  const monthTarget = sumTargets(monthStart, monthEnd);

  // Topics (last 30 days)
  for (const s of sessions.filter((x) => x.date >= subDays(todayStart, 30))) {
    const name = s.skill?.name ?? s.topic;
    topicMap.set(name, (topicMap.get(name) ?? 0) + s.minutes);
  }

  // Streaks
  const firstSession = sessions.length ? sessions[sessions.length - 1].date : null;
  const streak = computeStreaks(byDay, working, settings.streakMinMinutes, firstSession);

  // Tasks
  const isToday = (d: Date | null) => !!d && d >= todayStart && d <= todayEnd;
  const todayTasks = tasks.filter((t) => isToday(t.deadline) || (t.completed && isToday(t.completedAt)));
  const todayTasksDone = todayTasks.filter((t) => t.completed).length;
  const weekEnd = endOfDay(addDays(weekStart, 6));
  const weekTasks = tasks.filter(
    (t) => (t.deadline && t.deadline >= weekStart && t.deadline <= weekEnd) || (t.completedAt && t.completedAt >= weekStart),
  );
  const weekTasksDone = weekTasks.filter((t) => t.completed).length;

  // Goals completion per timeframe
  const goalCompletion = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].map((tf) => {
    const relevant = goals.filter((g) => g.timeframe === tf && g.status !== "ARCHIVED");
    const done = relevant.filter((g) => g.status === "COMPLETED").length;
    return { timeframe: tf, done, total: relevant.length, pct: relevant.length ? Math.round((done / relevant.length) * 100) : 0 };
  });

  // DSA
  const solved = dsa.filter((p) => p.status === "SOLVED");
  const dsaToday = solved.filter((p) => isToday(p.solvedAt)).length;

  // Charts
  const daily = eachDayOfInterval({ start: subDays(todayStart, 13), end: todayStart }).map((d) => ({
    label: format(d, "EEE d"),
    date: dayKey(d),
    minutes: byDay.get(dayKey(d)) ?? 0,
    // no target line before the plan started or on rest days
    target: tFor(d) > 0 && d >= startOfDay(settings.planStartDate) ? tFor(d) : null,
  }));

  const weekly = Array.from({ length: 8 }, (_, i) => {
    const ws = startOfWeek(subWeeks(now, 7 - i), WEEK_OPTS);
    const we = endOfDay(addDays(ws, 6));
    return {
      label: i === 7 ? "This wk" : format(ws, "MMM d"),
      minutes: sumRange(ws, we),
      target: sumTargets(ws < startOfDay(settings.planStartDate) ? startOfDay(settings.planStartDate) : ws, addDays(ws, 6)),
      tasks: tasks.filter((t) => t.completedAt && t.completedAt >= ws && t.completedAt <= we).length,
    };
  });

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(monthStart, 5 - i);
    return {
      label: format(m, "MMM"),
      hours: Math.round((sessions.filter((s) => isSameMonth(s.date, m)).reduce((a, s) => a + s.minutes, 0) / 60) * 10) / 10,
      problems: solved.filter((p) => isSameMonth(p.solvedAt, m)).length,
      tasks: tasks.filter((t) => t.completedAt && isSameMonth(t.completedAt, m)).length,
    };
  });

  const heatStart = startOfWeek(subWeeks(todayStart, 17), WEEK_OPTS);
  const heatmap = eachDayOfInterval({ start: heatStart, end: todayStart }).map((d) => {
    const minutes = byDay.get(dayKey(d)) ?? 0;
    const ratio = minutes / Math.max(1, tFor(d) || settings.dailyTargetMinutes);
    const level = minutes === 0 ? 0 : ratio < 0.34 ? 1 : ratio < 0.67 ? 2 : ratio < 1 ? 3 : 4;
    return { date: dayKey(d), minutes, level };
  });

  // Plan progress
  const planStart = startOfDay(settings.planStartDate);
  const planDays = settings.planWeeks * 7;
  const elapsed = differenceInCalendarDays(todayStart, planStart);
  const started = elapsed >= 0;
  const ended = elapsed >= planDays;
  const planEndDay = addDays(planStart, planDays - 1);
  const expectedMinutes = started
    ? sumTargets(planStart, subDays(todayStart, 1) < planEndDay ? subDays(todayStart, 1) : planEndDay)
    : 0;
  const actualMinutes = sessions.filter((s) => s.date >= planStart && s.date <= endOfDay(planEndDay)).reduce((a, s) => a + s.minutes, 0);
  const plan = {
    week: started ? Math.min(settings.planWeeks, Math.floor(elapsed / 7) + 1) : 0,
    weeks: settings.planWeeks,
    pct: started ? Math.min(100, Math.round(((elapsed + 1) / planDays) * 100)) : 0,
    daysLeft: Math.max(0, planDays - Math.max(0, elapsed) - (started ? 1 : 0)),
    expectedMinutes,
    actualMinutes,
    ended,
    started,
  };

  // Skills
  const allChecklist = skills.flatMap((s) => s.checklist);
  const skillsSummary = {
    gained: skills.filter((s) => s.level >= 70).length,
    total: skills.length,
    avgLevel: skills.length ? Math.round(skills.reduce((a, s) => a + s.level, 0) / skills.length) : 0,
    checklistDone: allChecklist.filter((c) => c.done).length,
    checklistTotal: allChecklist.length,
    top: [...skills].sort((a, b) => b.level - a.level).slice(0, 8).map((s) => ({ name: s.name, level: s.level, color: s.color })),
  };

  // Recovery plan
  const recovery = await buildRecovery({
    settings,
    working,
    byDay,
    tasks,
    goals,
    todayStart,
    weekStart,
  });

  const achievements = buildAchievements({
    sessions,
    streakBest: streak.best,
    allMinutes,
    solved,
    tasksDone: tasks.filter((t) => t.completed).length,
    goalsDone: goals.filter((g) => g.status === "COMPLETED").length,
    skills,
    notesCount,
    confidentQuestions: questions.filter((q) => q.confidence >= 4).length,
    revisions: dsa.reduce((a, p) => a + p.revisionCount, 0),
    byDay,
    working,
    targets,
  });

  // This week's roadmap focus: the nearest active weekly goal
  const [focusGoal, apps] = await Promise.all([
    prisma.goal.findFirst({
      where: { timeframe: "WEEKLY", status: "ACTIVE", deadline: { gte: todayStart } },
      orderBy: { deadline: "asc" },
      include: { tasks: { select: { completed: true } } },
    }),
    prisma.jobApplication.findMany({ select: { status: true, appliedAt: true } }),
  ]);
  const focus = focusGoal
    ? {
        id: focusGoal.id,
        title: focusGoal.title,
        description: focusGoal.description,
        done: focusGoal.tasks.filter((t) => t.completed).length,
        total: focusGoal.tasks.length,
      }
    : null;
  const jobs = {
    total: apps.length,
    thisWeek: apps.filter((a) => a.appliedAt >= weekStart && a.status !== "WISHLIST").length,
    interviewing: apps.filter((a) => a.status === "INTERVIEWING").length,
    offers: apps.filter((a) => a.status === "OFFER").length,
  };

  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const todayPct = todayTarget ? (todayMinutes / todayTarget) * 100 : 100;

  return {
    settings: serializeSettings(settings),
    greeting: greetingFor(settings.name),
    encouragement: pickEncouragement(differenceInCalendarDays(now, new Date(2024, 0, 1)), {
      todayPct,
      streak: streak.current,
      behind: recovery.needed,
    }),
    today: {
      minutes: todayMinutes,
      target: todayTarget,
      limit: settings.dailyLimitMinutes,
      isWorkingDay: working.has(now.getDay()),
      tasksDone: todayTasksDone,
      tasksTotal: todayTasks.length,
      dsaSolved: dsaToday,
      dsaTarget: settings.dailyDsaTarget,
    },
    totals: { todayMinutes, weekMinutes, monthMinutes, allMinutes, weekTarget, monthTarget, sessions: sessions.length },
    completion: {
      todayTasks: todayTasks.length ? Math.round((todayTasksDone / todayTasks.length) * 100) : 0,
      weekTasks: weekTasks.length ? Math.round((weekTasksDone / weekTasks.length) * 100) : 0,
      goals: goalCompletion,
    },
    streak: { ...streak, minMinutes: settings.streakMinMinutes },
    plan,
    charts: {
      daily,
      weekly,
      monthly,
      heatmap,
      topics: Array.from(topicMap.entries())
        .map(([name, minutes]) => ({ name, minutes }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 6),
    },
    skills: skillsSummary,
    dsa: {
      total: solved.length,
      easy: solved.filter((p) => p.difficulty === "EASY").length,
      medium: solved.filter((p) => p.difficulty === "MEDIUM").length,
      hard: solved.filter((p) => p.difficulty === "HARD").length,
      dueRevision: dsa.filter((p) => p.nextRevision && p.nextRevision <= todayEnd).length,
      thisWeek: solved.filter((p) => p.solvedAt >= weekStart).length,
    },
    xp: {
      total: xp,
      level,
      levelProgress: Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100),
      nextLevelXp: level * XP_PER_LEVEL,
    },
    rewards: rewardsWithProgress(rewards, xp),
    achievements,
    recovery,
    focus,
    jobs,
    upcomingTasks: JSON.parse(
      JSON.stringify(
        tasks
          .filter((t) => !t.completed)
          .sort((a, b) => (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity))
          .slice(0, 6),
      ),
    ),
    recentSessions: JSON.parse(JSON.stringify(sessions.slice(0, 5))),
  };
}

export function serializeSettings(s: Awaited<ReturnType<typeof getSettings>>): SettingsDTO {
  return {
    ...s,
    planStartDate: s.planStartDate.toISOString(),
    theme: s.theme as SettingsDTO["theme"],
  } as unknown as SettingsDTO;
}

// ---------- Recovery ----------

async function buildRecovery(ctx: {
  settings: Awaited<ReturnType<typeof getSettings>>;
  working: Set<number>;
  byDay: Map<string, number>;
  tasks: { id: number; title: string; priority: string; deadline: Date | null; completed: boolean; estimatedMinutes: number }[];
  goals: { id: number; title: string; timeframe: string; status: string; deadline: Date | null }[];
  todayStart: Date;
  weekStart: Date;
}): Promise<RecoveryPlan> {
  const { settings, working, byDay, todayStart, weekStart } = ctx;
  const targets = dayTargetsOf(settings);

  // Deficit for this week's working days before today (look back to last week if today is Monday)
  const lookbackStart = differenceInCalendarDays(todayStart, weekStart) < 1 ? subDays(weekStart, 7) : weekStart;
  let deficit = 0;
  const missedDays: string[] = [];
  for (let d = lookbackStart; d < todayStart; d = addDays(d, 1)) {
    if (!working.has(d.getDay())) continue;
    if (d < startOfDay(settings.planStartDate)) continue;
    const mins = byDay.get(dayKey(d)) ?? 0;
    const target = targets[d.getDay()];
    if (mins < target) {
      deficit += target - mins;
      if (mins < settings.streakMinMinutes) missedDays.push(format(d, "EEEE"));
    }
  }

  const priorityRank: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const overdueTasks = ctx.tasks
    .filter((t) => !t.completed && t.deadline && t.deadline < todayStart)
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  const overdueGoals = ctx.goals.filter((g) => g.status === "ACTIVE" && g.deadline && g.deadline < todayStart);

  // Spread the deficit over the next working days (max +60 min/day to avoid burnout)
  let remainingWorking = 0;
  for (let i = 0; i < 7; i++) if (working.has(addDays(todayStart, i).getDay())) remainingWorking++;
  const extraPerDay = deficit > 0 ? Math.min(60, Math.ceil(deficit / Math.max(1, remainingWorking) / 5) * 5) : 0;
  const recoverable = extraPerDay * remainingWorking;

  const avgTarget = settings.dailyTargetMinutes;
  const needed = deficit >= avgTarget * 0.5 || overdueTasks.length > 0 || overdueGoals.length > 0;
  const steps: string[] = [];
  if (deficit > 0)
    steps.push(
      `Add ${extraPerDay} extra minutes on each of your next ${remainingWorking} working days (on top of each day's target). ` +
        (recoverable < deficit ? "Let the rest go — consistency matters more than catching up everything." : "That fully closes the gap."),
    );
  if (overdueTasks.length) {
    const top = overdueTasks.slice(0, 3).map((t) => `"${t.title}"`).join(", ");
    steps.push(`Start with your highest-priority overdue work: ${top}. Use "Reschedule overdue" to spread the rest over the coming days.`);
  }
  if (overdueGoals.length) steps.push(`Review ${overdueGoals.length} goal(s) past their deadline — extend the date or split them into smaller goals.`);
  steps.push("Open with a quick win: one easy DSA revision or a 25-minute focus block to rebuild momentum.");
  steps.push("Before bed, plan tomorrow's top 3 tasks so you start with zero decisions.");

  const headline = missedDays.length
    ? `You missed ${missedDays.join(", ")} — let's get back on track`
    : overdueTasks.length
      ? `${overdueTasks.length} task${overdueTasks.length > 1 ? "s are" : " is"} overdue — time for a reset`
      : "You're a little behind this week";

  const message =
    "Missing a day doesn't erase your progress — but missing two starts a pattern. " +
    "No guilt, just a plan: do the next right thing today, and the week is still yours.";

  return {
    needed,
    headline,
    message,
    deficitMinutes: deficit,
    extraMinutesPerDay: extraPerDay,
    overdueTasks: JSON.parse(JSON.stringify(overdueTasks.slice(0, 8))),
    overdueGoals: overdueGoals.map((g) => ({ id: g.id, title: g.title, timeframe: g.timeframe, deadline: g.deadline?.toISOString() ?? null })),
    steps,
  };
}

// ---------- Achievements ----------

function buildAchievements(ctx: {
  sessions: { minutes: number }[];
  streakBest: number;
  allMinutes: number;
  solved: { difficulty: string }[];
  tasksDone: number;
  goalsDone: number;
  skills: { level: number }[];
  notesCount: number;
  confidentQuestions: number;
  revisions: number;
  byDay: Map<string, number>;
  working: Set<number>;
  targets: number[];
}): Achievement[] {
  const hours = ctx.allMinutes / 60;
  const longest = ctx.sessions.reduce((m, s) => Math.max(m, s.minutes), 0);
  const hard = ctx.solved.filter((p) => p.difficulty === "HARD").length;
  const proficient = ctx.skills.filter((s) => s.level >= 70).length;

  // Perfect weeks: completed Mon-Sun weeks (last 26) where every working day hit the target
  let perfectWeeks = 0;
  const thisWeek = startOfWeek(new Date(), WEEK_OPTS);
  for (let w = 1; w <= 26; w++) {
    const ws = subWeeks(thisWeek, w);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i)).filter((d) => ctx.working.has(d.getDay()));
    if (days.length && days.every((d) => (ctx.byDay.get(dayKey(d)) ?? 0) >= ctx.targets[d.getDay()])) perfectWeeks++;
  }

  const defs: [string, string, string, string, number, number][] = [
    ["first-step", "First Step", "Log your first study session", "👣", ctx.sessions.length, 1],
    ["deep-work", "Deep Work", "Study 2 hours in one session", "🧠", longest, 120],
    ["streak-3", "On Fire", "Reach a 3-day streak", "🔥", ctx.streakBest, 3],
    ["streak-7", "Unstoppable", "Reach a 7-day streak", "⚡️", ctx.streakBest, 7],
    ["streak-21", "Iron Will", "Reach a 21-day streak", "🛡️", ctx.streakBest, 21],
    ["hours-10", "10 Hour Club", "Study 10 hours in total", "⏱️", hours, 10],
    ["hours-50", "Half Century", "Study 50 hours in total", "📚", hours, 50],
    ["hours-100", "Centurion", "Study 100 hours in total", "🏛️", hours, 100],
    ["hours-250", "Mastery Path", "Study 250 hours in total", "🌌", hours, 250],
    ["dsa-10", "Problem Solver", "Solve 10 DSA problems", "🧩", ctx.solved.length, 10],
    ["dsa-50", "DSA Warrior", "Solve 50 DSA problems", "⚔️", ctx.solved.length, 50],
    ["dsa-150", "Algorithm Ace", "Solve 150 DSA problems", "🏆", ctx.solved.length, 150],
    ["hard-5", "Hard Hitter", "Solve 5 hard problems", "💎", hard, 5],
    ["tasks-25", "Task Crusher", "Complete 25 tasks", "✅", ctx.tasksDone, 25],
    ["tasks-100", "Execution Machine", "Complete 100 tasks", "🚀", ctx.tasksDone, 100],
    ["goal-1", "Goal Getter", "Complete your first goal", "🎯", ctx.goalsDone, 1],
    ["skill-1", "Level Up", "Get a skill to 70%", "📈", proficient, 1],
    ["skill-5", "Full-Stack Mind", "Get 5 skills to 70%", "🧑‍💻", proficient, 5],
    ["notes-10", "Note Taker", "Write 10 notes", "📝", ctx.notesCount, 10],
    ["interview-20", "Interview Ready", "Feel confident (4+) on 20 questions", "🎤", ctx.confidentQuestions, 20],
    ["revision-10", "Revision Master", "Revise problems 10 times", "🔁", ctx.revisions, 10],
    ["perfect-week", "Perfect Week", "Hit your target every working day of a week", "🌟", perfectWeeks, 1],
  ];

  return defs.map(([id, title, description, emoji, current, target]) => ({
    id,
    title,
    description,
    emoji,
    current: Math.floor(current),
    target,
    unlocked: current >= target,
    progress: Math.min(100, Math.round((current / target) * 100)),
  }));
}
