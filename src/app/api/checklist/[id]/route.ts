import { z } from "zod";
import { handler, IdContext, ok, parseBody, parseId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const PATCH = handler(async (req: Request, { params }: IdContext) => {
  const data = await parseBody(
    req,
    z.object({ done: z.boolean().optional(), text: z.string().trim().min(1).max(200).optional() }),
  );
  return ok(await prisma.checklistItem.update({ where: { id: parseId(params.id) }, data }));
});

export const DELETE = handler(async (_req: Request, { params }: IdContext) => {
  await prisma.checklistItem.delete({ where: { id: parseId(params.id) } });
  return ok({ ok: true });
});
