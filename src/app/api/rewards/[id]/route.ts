import { z } from "zod";
import { handler, HttpError, IdContext, ok, parseBody, parseId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { computeXp } from "@/lib/stats";
import { rewardSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PUT = handler(async (req: Request, { params }: IdContext) => {
  const data = await parseBody(req, rewardSchema);
  return ok(await prisma.reward.update({ where: { id: parseId(params.id) }, data }));
});

/** Claim (or un-claim) a reward once you've earned enough XP. */
export const PATCH = handler(async (req: Request, { params }: IdContext) => {
  const id = parseId(params.id);
  const { claimed } = await parseBody(req, z.object({ claimed: z.boolean() }));
  if (claimed) {
    const [reward, xp] = await Promise.all([prisma.reward.findUniqueOrThrow({ where: { id } }), computeXp()]);
    if (xp < reward.targetXp) throw new HttpError(400, `Keep going! You need ${reward.targetXp - xp} more XP to claim this.`);
  }
  return ok(await prisma.reward.update({ where: { id }, data: { claimedAt: claimed ? new Date() : null } }));
});

export const DELETE = handler(async (_req: Request, { params }: IdContext) => {
  await prisma.reward.delete({ where: { id: parseId(params.id) } });
  return ok({ ok: true });
});
