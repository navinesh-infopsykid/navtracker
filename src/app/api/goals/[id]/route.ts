import { z } from "zod";
import { handler, HttpError, IdContext, ok, parseBody, parseId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { GOAL_STATUSES } from "@/lib/constants";
import { goalSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PUT = handler(async (req: Request, { params }: IdContext) => {
  const id = parseId(params.id);
  const data = await parseBody(req, goalSchema);
  if (data.parentId === id) throw new HttpError(422, "A goal can't be its own parent", { parentId: "Pick a different parent goal" });
  const existing = await prisma.goal.findUniqueOrThrow({ where: { id } });
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...data,
      completedAt: data.status === "COMPLETED" ? existing.completedAt ?? new Date() : null,
    },
  });
  return ok(goal);
});

export const PATCH = handler(async (req: Request, { params }: IdContext) => {
  const id = parseId(params.id);
  const { status } = await parseBody(req, z.object({ status: z.enum(GOAL_STATUSES) }));
  const goal = await prisma.goal.update({
    where: { id },
    data: { status, completedAt: status === "COMPLETED" ? new Date() : null },
  });
  return ok(goal);
});

export const DELETE = handler(async (_req: Request, { params }: IdContext) => {
  const id = parseId(params.id);
  await prisma.goal.delete({ where: { id } });
  return ok({ ok: true });
});
