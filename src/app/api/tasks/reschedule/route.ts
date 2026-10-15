import { addDays, startOfDay } from "date-fns";
import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSettings, workingDaySet } from "@/lib/stats";

export const dynamic = "force-dynamic";

/**
 * Recovery helper: spreads overdue tasks across upcoming working days,
 * highest priority first, so no single day gets overloaded.
 */
export const POST = handler(async () => {
  const settings = await getSettings();
  const working = workingDaySet(settings);
  const today = startOfDay(new Date());
  const rank: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const overdue = await prisma.task.findMany({ where: { completed: false, deadline: { lt: today } } });
  overdue.sort((a, b) => rank[a.priority] - rank[b.priority]);

  // Capacity: half the daily target for rescheduled work, so normal plans still fit.
  const capacity = Math.max(30, Math.round(settings.dailyTargetMinutes / 2));
  let day = today;
  let used = 0;
  const nextWorkingDay = (d: Date) => {
    let n = d;
    for (let i = 0; i < 14; i++) {
      if (working.has(n.getDay())) return n;
      n = addDays(n, 1);
    }
    return d;
  };
  day = nextWorkingDay(day);

  for (const task of overdue) {
    if (used > 0 && used + task.estimatedMinutes > capacity) {
      day = nextWorkingDay(addDays(day, 1));
      used = 0;
    }
    used += task.estimatedMinutes;
    const deadline = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12);
    await prisma.task.update({ where: { id: task.id }, data: { deadline } });
  }
  return ok({ rescheduled: overdue.length });
});
