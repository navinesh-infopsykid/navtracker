import { addDays, eachDayOfInterval, endOfDay, startOfDay } from "date-fns";
import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/dates";
import { getSettings, serializeSettings } from "@/lib/stats";
import { dayTargetsOf } from "@/lib/targets";

export const dynamic = "force-dynamic";

/**
 * The week board. Weeks follow your plan (week 1 starts on the plan start date).
 * ?offset=-1 / 1 shows the previous / next plan week.
 */
export const GET = handler(async (req: Request) => {
  const offset = Number(new URL(req.url).searchParams.get("offset") ?? 0) || 0;
  const settings = await getSettings();
  const targets = dayTargetsOf(settings);
  const planStart = startOfDay(settings.planStartDate);
  const today = startOfDay(new Date());

  const currentIndex = Math.floor((today.getTime() - planStart.getTime()) / (7 * 864e5)); // 0-based, may be negative
  const index = currentIndex + offset;
  const start = addDays(planStart, index * 7);
  const end = endOfDay(addDays(start, 6));
  const isCurrent = offset === 0;

  const [tasks, carryOver, ahead, sessions, weekGoal] = await Promise.all([
    prisma.task.findMany({
      where: { deadline: { gte: start, lte: end } },
      include: { goal: { select: { id: true, title: true } } },
      orderBy: [{ deadline: "asc" }, { id: "asc" }],
    }),
    // unfinished work from earlier weeks (only shown on the current week)
    isCurrent
      ? prisma.task.findMany({
          where: { completed: false, deadline: { lt: start } },
          include: { goal: { select: { id: true, title: true } } },
          orderBy: [{ deadline: "asc" }],
        })
      : Promise.resolve([]),
    // next tasks in the plan you can pull into this week
    prisma.task.findMany({
      where: { completed: false, deadline: { gt: end } },
      include: { goal: { select: { id: true, title: true } } },
      orderBy: [{ deadline: "asc" }, { id: "asc" }],
      take: 12,
    }),
    prisma.studySession.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true, minutes: true } }),
    prisma.goal.findFirst({
      where: { timeframe: "WEEKLY", deadline: { gte: start, lte: end } },
      orderBy: { deadline: "asc" },
      select: { id: true, title: true, description: true, status: true },
    }),
  ]);

  const days = eachDayOfInterval({ start, end: startOfDay(end) }).map((d) => {
    const key = dayKey(d);
    return {
      date: key,
      target: targets[d.getDay()],
      studied: sessions.filter((s) => dayKey(s.date) === key).reduce((a, s) => a + s.minutes, 0),
      isToday: key === dayKey(today),
      isPast: d < today,
    };
  });

  const weekTarget = days.reduce((a, d) => a + d.target, 0);
  const studied = days.reduce((a, d) => a + d.studied, 0);
  // capacity left = remaining days' targets (today counts what's still left of it)
  const capacityLeft = days
    .filter((d) => !d.isPast)
    .reduce((a, d) => a + (d.isToday ? Math.max(0, d.target - d.studied) : d.target), 0);
  const openTasks = [...tasks.filter((t) => !t.completed), ...carryOver];
  const plannedLeft = openTasks.reduce((a, t) => a + t.estimatedMinutes, 0);

  return ok({
    settings: serializeSettings(settings),
    week: index + 1,
    weeks: settings.planWeeks,
    offset,
    isCurrent,
    start: start.toISOString(),
    end: end.toISOString(),
    goal: weekGoal,
    days,
    tasks,
    carryOver,
    ahead,
    stats: {
      weekTarget,
      studied,
      capacityLeft,
      plannedLeft,
      done: tasks.filter((t) => t.completed).length,
      total: tasks.length,
      doneMinutes: tasks.filter((t) => t.completed).reduce((a, t) => a + (t.actualMinutes ?? t.estimatedMinutes), 0),
      plannedMinutes: tasks.reduce((a, t) => a + t.estimatedMinutes, 0),
    },
  });
});
