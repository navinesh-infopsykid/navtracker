import { Prisma } from "@prisma/client";
import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { noteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
const include = { skill: { select: { id: true, name: true, color: true } } };

export const GET = handler(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const where: Prisma.NoteWhereInput = {};
  const q = sp.get("q")?.trim();
  if (q) where.OR = [{ title: { contains: q } }, { content: { contains: q } }, { tags: { contains: q.toLowerCase() } }, { topic: { contains: q } }];
  const topic = sp.get("topic");
  if (topic && topic !== "ALL") where.topic = topic;
  const skillId = sp.get("skillId");
  if (skillId && skillId !== "ALL") where.skillId = Number(skillId);
  if (sp.get("interview") === "1") where.isInterview = true;

  const [notes, topics] = await Promise.all([
    prisma.note.findMany({ where, include, orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }] }),
    prisma.note.groupBy({ by: ["topic"], _count: true, orderBy: { topic: "asc" } }),
  ]);
  return ok({ notes, topics: topics.map((t) => ({ topic: t.topic, count: t._count })) });
});

export const POST = handler(async (req: Request) => {
  const data = await parseBody(req, noteSchema);
  return ok(await prisma.note.create({ data, include }), 201);
});
