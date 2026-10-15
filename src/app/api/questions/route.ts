import { Prisma } from "@prisma/client";
import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { questionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const where: Prisma.InterviewQuestionWhereInput = {};
  const q = sp.get("q")?.trim();
  if (q) where.OR = [{ question: { contains: q } }, { answer: { contains: q } }];
  const skillId = sp.get("skillId");
  if (skillId && skillId !== "ALL") where.skillId = Number(skillId);
  const questions = await prisma.interviewQuestion.findMany({
    where,
    include: { skill: { select: { id: true, name: true, color: true } } },
    orderBy: [{ confidence: "asc" }, { updatedAt: "desc" }],
  });
  return ok(questions);
});

export const POST = handler(async (req: Request) => {
  const data = await parseBody(req, questionSchema);
  return ok(
    await prisma.interviewQuestion.create({ data, include: { skill: { select: { id: true, name: true, color: true } } } }),
    201,
  );
});
