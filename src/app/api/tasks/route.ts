import { addDays, endOfDay, startOfDay } from "date-fns";
import { Prisma } from "@prisma/client";
import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "open";
  const goalId = searchParams.get("goalId");
  const now = new Date();
  const where: Prisma.TaskWhereInput = goalId ? { goalId: Number(goalId) } : {};

  switch (filter) {
    case "today":
      where.completed = false;
      where.deadline = { lte: endOfDay(now) };
      break;
    case "upcoming":
      where.completed = false;
      where.deadline = { gt: endOfDay(now), lte: endOfDay(addDays(now, 14)) };
      break;
    case "overdue":
      where.completed = false;
      where.deadline = { lt: startOfDay(now) };
      break;
    case "completed":
      where.completed = true;
      break;
    case "open":
      where.completed = false;
      break;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: { goal: { select: { id: true, title: true } } },
    orderBy: filter === "completed" ? [{ completedAt: "desc" }] : [{ deadline: "asc" }, { createdAt: "asc" }],
    take: 300,
  });
  // SQLite sorts NULL deadlines first; push them to the end for open lists.
  if (filter !== "completed") tasks.sort((a, b) => (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity));
  return ok(tasks);
});

export const POST = handler(async (req: Request) => {
  const data = await parseBody(req, taskSchema);
  const task = await prisma.task.create({
    data: { ...data, completed: data.completed ?? false, completedAt: data.completed ? new Date() : null },
    include: { goal: { select: { id: true, title: true } } },
  });
  return ok(task, 201);
});
