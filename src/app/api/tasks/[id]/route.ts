import { Prisma } from "@prisma/client";
import { z } from "zod";
import { handler, IdContext, ok, parseBody, parseId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { fromDateInput } from "@/lib/dates";
import { taskSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PUT = handler(async (req: Request, { params }: IdContext) => {
  const id = parseId(params.id);
  const data = await parseBody(req, taskSchema);
  const existing = await prisma.task.findUniqueOrThrow({ where: { id } });
  const completed = data.completed ?? existing.completed;
  const task = await prisma.task.update({
    where: { id },
    data: { ...data, completed, completedAt: completed ? existing.completedAt ?? new Date() : null },
    include: { goal: { select: { id: true, title: true } } },
  });
  return ok(task);
});

const patchSchema = z.object({
  completed: z.boolean().optional(),
  // "yyyy-MM-dd" to move the task to another day, null to remove the deadline
  deadline: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"), z.null()]).optional(),
  estimatedMinutes: z.coerce.number().int().min(5, "At least 5 minutes").max(720).optional(),
  actualMinutes: z.coerce.number().int().min(1, "At least 1 minute").max(720).nullable().optional(),
  // when completing: also add the time as a study session (counts toward your weekly target)
  logSession: z.boolean().optional(),
});

/**
 * Quick updates from the week board: complete/uncomplete (optionally with the time it took),
 * move to another day, or adjust the estimate.
 */
export const PATCH = handler(async (req: Request, { params }: IdContext) => {
  const id = parseId(params.id);
  const body = await parseBody(req, patchSchema);
  const existing = await prisma.task.findUniqueOrThrow({ where: { id } });

  const data: Prisma.TaskUncheckedUpdateInput = {};
  if (body.completed !== undefined) {
    data.completed = body.completed;
    data.completedAt = body.completed ? existing.completedAt ?? new Date() : null;
    if (!body.completed) {
      data.actualMinutes = null;
      data.loggedSessionId = null;
      // undo the study time that was added when it was completed
      if (existing.loggedSessionId) await prisma.studySession.deleteMany({ where: { id: existing.loggedSessionId } });
    }
  }
  if (body.deadline !== undefined) data.deadline = body.deadline ? fromDateInput(body.deadline) : null;
  if (body.estimatedMinutes !== undefined) data.estimatedMinutes = body.estimatedMinutes;
  if (body.actualMinutes !== undefined) data.actualMinutes = body.actualMinutes;

  const task = await prisma.task.update({
    where: { id },
    data,
    include: { goal: { select: { id: true, title: true } } },
  });

  let session = null;
  if (body.completed && body.logSession && body.actualMinutes) {
    const now = new Date();
    session = await prisma.studySession.create({
      data: {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12),
        minutes: body.actualMinutes,
        topic: task.title.slice(0, 120),
        notes: "Logged from a completed task",
        focus: 4,
      },
    });
  }
  if (session) await prisma.task.update({ where: { id }, data: { loggedSessionId: session.id } });
  return ok({ ...task, loggedSessionId: session?.id ?? task.loggedSessionId });
});

export const DELETE = handler(async (_req: Request, { params }: IdContext) => {
  await prisma.task.delete({ where: { id: parseId(params.id) } });
  return ok({ ok: true });
});
