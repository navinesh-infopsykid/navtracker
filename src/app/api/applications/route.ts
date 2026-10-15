import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { applicationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const q = sp.get("q")?.trim();
  const apps = await prisma.jobApplication.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(q ? { OR: [{ company: { contains: q } }, { role: { contains: q } }, { notes: { contains: q } }] } : {}),
    },
    orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
  });
  return ok(apps);
});

export const POST = handler(async (req: Request) => {
  const data = await parseBody(req, applicationSchema);
  return ok(await prisma.jobApplication.create({ data }), 201);
});
