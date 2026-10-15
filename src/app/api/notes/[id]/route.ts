import { z } from "zod";
import { handler, IdContext, ok, parseBody, parseId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { noteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
const include = { skill: { select: { id: true, name: true, color: true } } };

export const PUT = handler(async (req: Request, { params }: IdContext) => {
  const data = await parseBody(req, noteSchema);
  return ok(await prisma.note.update({ where: { id: parseId(params.id) }, data, include }));
});

export const PATCH = handler(async (req: Request, { params }: IdContext) => {
  const { pinned } = await parseBody(req, z.object({ pinned: z.boolean() }));
  return ok(await prisma.note.update({ where: { id: parseId(params.id) }, data: { pinned }, include }));
});

export const DELETE = handler(async (_req: Request, { params }: IdContext) => {
  await prisma.note.delete({ where: { id: parseId(params.id) } });
  return ok({ ok: true });
});
