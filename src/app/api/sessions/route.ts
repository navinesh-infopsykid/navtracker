import { endOfDay, startOfDay } from "date-fns";
import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { fromDateInput } from "@/lib/dates";
import { getSettings, targetFor } from "@/lib/stats";
import { sessionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const sessions = await prisma.studySession.findMany({
    where: {
      date: {
        ...(from ? { gte: startOfDay(fromDateInput(from)) } : {}),
        ...(to ? { lte: endOfDay(fromDateInput(to)) } : {}),
      },
    },
    include: { skill: { select: { id: true, name: true, color: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: Number(searchParams.get("limit") ?? 200),
  });
  return ok(sessions);
});

/** Creates a session and tells the UI whether today's daily limit was exceeded. */
export const POST = handler(async (req: Request) => {
  const data = await parseBody(req, sessionSchema);
  const session = await prisma.studySession.create({
    data,
    include: { skill: { select: { id: true, name: true, color: true } } },
  });
  const settings = await getSettings();
  const agg = await prisma.studySession.aggregate({
    where: { date: { gte: startOfDay(data.date), lte: endOfDay(data.date) } },
    _sum: { minutes: true },
  });
  const dayTotal = agg._sum.minutes ?? 0;
  return ok(
    {
      session,
      dayTotal,
      dayTarget: targetFor(settings, data.date),
      reachedTarget: targetFor(settings, data.date) > 0 && dayTotal >= targetFor(settings, data.date),
      overLimit: dayTotal > settings.dailyLimitMinutes,
    },
    201,
  );
});
