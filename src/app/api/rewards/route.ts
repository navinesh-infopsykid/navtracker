import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { computeXp, rewardsWithProgress } from "@/lib/stats";
import { rewardSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const [rewards, xp] = await Promise.all([
    prisma.reward.findMany({ orderBy: [{ sortOrder: "asc" }, { targetXp: "asc" }] }),
    computeXp(),
  ]);
  return ok({ xp, rewards: rewardsWithProgress(rewards, xp) });
});

export const POST = handler(async (req: Request) => {
  const data = await parseBody(req, rewardSchema);
  const count = await prisma.reward.count();
  return ok(await prisma.reward.create({ data: { ...data, sortOrder: count } }), 201);
});
