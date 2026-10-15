import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checklistSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const data = await parseBody(req, checklistSchema);
  const count = await prisma.checklistItem.count({ where: { skillId: data.skillId } });
  return ok(await prisma.checklistItem.create({ data: { ...data, sortOrder: count } }), 201);
});
