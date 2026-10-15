import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { skillSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const [skills, minutes] = await Promise.all([
    prisma.skill.findMany({
      include: {
        checklist: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
        _count: { select: { questions: true, topicNotes: true, sessions: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.studySession.groupBy({ by: ["skillId"], _sum: { minutes: true } }),
  ]);
  const byId = new Map(minutes.map((m) => [m.skillId, m._sum.minutes ?? 0]));
  return ok(skills.map((s) => ({ ...s, minutes: byId.get(s.id) ?? 0 })));
});

export const POST = handler(async (req: Request) => {
  const data = await parseBody(req, skillSchema);
  const count = await prisma.skill.count();
  const skill = await prisma.skill.create({
    data: { ...data, isCustom: true, sortOrder: count },
    include: { checklist: true },
  });
  return ok(skill, 201);
});
