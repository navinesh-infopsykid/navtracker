import { endOfDay } from "date-fns";
import { Prisma } from "@prisma/client";
import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dsaSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const where: Prisma.DsaProblemWhereInput = {};
  if (q) where.OR = [{ title: { contains: q } }, { topic: { contains: q } }, { approach: { contains: q } }, { platform: { contains: q } }];
  for (const key of ["difficulty", "topic", "status", "platform"] as const) {
    const v = sp.get(key);
    if (v && v !== "ALL") where[key] = v;
  }
  if (sp.get("starred") === "1") where.starred = true;
  if (sp.get("due") === "1") where.nextRevision = { lte: endOfDay(new Date()) };

  const problems = await prisma.dsaProblem.findMany({
    where,
    orderBy: sp.get("due") === "1" ? [{ nextRevision: "asc" }] : [{ solvedAt: "desc" }, { id: "desc" }],
  });
  // Worked-on problems first (newest first), then the to-do list in planned order.
  if (sp.get("due") !== "1") {
    const done = problems.filter((p) => p.status !== "TODO");
    const todo = problems.filter((p) => p.status === "TODO").sort((a, b) => a.solvedAt.getTime() - b.solvedAt.getTime() || a.id - b.id);
    return ok([...done, ...todo]);
  }
  return ok(problems);
});

export const POST = handler(async (req: Request) => {
  const data = await parseBody(req, dsaSchema);
  const problem = await prisma.dsaProblem.create({ data });
  return ok(problem, 201);
});
