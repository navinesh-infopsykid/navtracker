import { z } from "zod";
import { handler, IdContext, ok, parseBody, parseId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { questionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
const include = { skill: { select: { id: true, name: true, color: true } } };

export const PUT = handler(async (req: Request, { params }: IdContext) => {
  const data = await parseBody(req, questionSchema);
  return ok(await prisma.interviewQuestion.update({ where: { id: parseId(params.id) }, data, include }));
});

/** Mark reviewed with a new confidence score */
export const PATCH = handler(async (req: Request, { params }: IdContext) => {
  const { confidence } = await parseBody(req, z.object({ confidence: z.coerce.number().int().min(1).max(5) }));
  return ok(
    await prisma.interviewQuestion.update({
      where: { id: parseId(params.id) },
      data: { confidence, lastReviewed: new Date() },
      include,
    }),
  );
});

export const DELETE = handler(async (_req: Request, { params }: IdContext) => {
  await prisma.interviewQuestion.delete({ where: { id: parseId(params.id) } });
  return ok({ ok: true });
});
