import { z } from "zod";
import { handler, IdContext, ok, parseBody, parseId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { APP_STATUSES } from "@/lib/constants";
import { applicationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PUT = handler(async (req: Request, { params }: IdContext) => {
  const data = await parseBody(req, applicationSchema);
  return ok(await prisma.jobApplication.update({ where: { id: parseId(params.id) }, data }));
});

/** Quick status change from the list */
export const PATCH = handler(async (req: Request, { params }: IdContext) => {
  const { status } = await parseBody(req, z.object({ status: z.enum(APP_STATUSES) }));
  return ok(await prisma.jobApplication.update({ where: { id: parseId(params.id) }, data: { status } }));
});

export const DELETE = handler(async (_req: Request, { params }: IdContext) => {
  await prisma.jobApplication.delete({ where: { id: parseId(params.id) } });
  return ok({ ok: true });
});
