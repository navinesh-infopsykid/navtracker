import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { goalSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const timeframe = searchParams.get("timeframe");
  const status = searchParams.get("status");
  const goals = await prisma.goal.findMany({
    where: {
      ...(timeframe && timeframe !== "ALL" ? { timeframe } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
    },
    include: {
      tasks: { orderBy: [{ completed: "asc" }, { deadline: "asc" }] },
      parent: { select: { id: true, title: true } },
    },
    orderBy: [{ status: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
  });
  return ok(goals);
});

export const POST = handler(async (req: Request) => {
  const data = await parseBody(req, goalSchema);
  const goal = await prisma.goal.create({
    data: { ...data, completedAt: data.status === "COMPLETED" ? new Date() : null },
    include: { tasks: true },
  });
  return ok(goal, 201);
});
