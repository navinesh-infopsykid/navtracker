import { handler, IdContext, ok, parseBody, parseId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { sessionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PUT = handler(async (req: Request, { params }: IdContext) => {
  const data = await parseBody(req, sessionSchema);
  const session = await prisma.studySession.update({
    where: { id: parseId(params.id) },
    data,
    include: { skill: { select: { id: true, name: true, color: true } } },
  });
  return ok(session);
});

export const DELETE = handler(async (_req: Request, { params }: IdContext) => {
  await prisma.studySession.delete({ where: { id: parseId(params.id) } });
  return ok({ ok: true });
});
