import { addDays } from "date-fns";
import { z } from "zod";
import { handler, IdContext, ok, parseBody, parseId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dsaSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Spaced repetition: each revision pushes the next one further out.
const INTERVALS = [1, 3, 7, 14, 30, 60];

export const GET = handler(async (_req: Request, { params }: IdContext) =>
  ok(await prisma.dsaProblem.findUniqueOrThrow({ where: { id: parseId(params.id) } })),
);

export const PUT = handler(async (req: Request, { params }: IdContext) => {
  const data = await parseBody(req, dsaSchema);
  return ok(await prisma.dsaProblem.update({ where: { id: parseId(params.id) }, data }));
});

const patchSchema = z.union([
  z.object({ action: z.literal("revise") }),
  z.object({ action: z.literal("solve") }),
  z.object({ action: z.literal("star"), starred: z.boolean() }),
]);

export const PATCH = handler(async (req: Request, { params }: IdContext) => {
  const id = parseId(params.id);
  const body = await parseBody(req, patchSchema);
  if (body.action === "star") return ok(await prisma.dsaProblem.update({ where: { id }, data: { starred: body.starred } }));

  const now0 = new Date();
  const todayNoon = new Date(now0.getFullYear(), now0.getMonth(), now0.getDate(), 12);
  if (body.action === "solve") {
    // Plan rule: re-solve 3 days later without looking
    return ok(
      await prisma.dsaProblem.update({
        where: { id },
        data: { status: "SOLVED", solvedAt: todayNoon, nextRevision: addDays(todayNoon, 3) },
      }),
    );
  }

  const p = await prisma.dsaProblem.findUniqueOrThrow({ where: { id } });
  const next = INTERVALS[Math.min(p.revisionCount + 1, INTERVALS.length - 1)];
  const now = new Date();
  const updated = await prisma.dsaProblem.update({
    where: { id },
    data: {
      revisionCount: { increment: 1 },
      nextRevision: addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12), next),
      status: p.status === "REVISIT" ? "SOLVED" : p.status,
    },
  });
  return ok(updated);
});

export const DELETE = handler(async (_req: Request, { params }: IdContext) => {
  await prisma.dsaProblem.delete({ where: { id: parseId(params.id) } });
  return ok({ ok: true });
});
