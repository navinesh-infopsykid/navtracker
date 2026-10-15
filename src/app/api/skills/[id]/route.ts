import { z } from "zod";
import { handler, IdContext, ok, parseBody, parseId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { skillSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PUT = handler(async (req: Request, { params }: IdContext) => {
  const data = await parseBody(req, skillSchema);
  return ok(await prisma.skill.update({ where: { id: parseId(params.id) }, data }));
});

/** Quick level / notes update */
export const PATCH = handler(async (req: Request, { params }: IdContext) => {
  const data = await parseBody(
    req,
    z.object({ level: z.coerce.number().int().min(0).max(100).optional(), notes: z.string().max(10000).nullable().optional() }),
  );
  return ok(await prisma.skill.update({ where: { id: parseId(params.id) }, data }));
});

export const DELETE = handler(async (_req: Request, { params }: IdContext) => {
  await prisma.skill.delete({ where: { id: parseId(params.id) } });
  return ok({ ok: true });
});
