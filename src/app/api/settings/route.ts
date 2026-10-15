import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSettings, serializeSettings } from "@/lib/stats";
import { settingsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async () => ok(serializeSettings(await getSettings())));

export const PUT = handler(async (req: Request) => {
  const data = await parseBody(req, settingsSchema);
  await getSettings(); // make sure the row exists
  const updated = await prisma.settings.update({ where: { id: 1 }, data });
  return ok(serializeSettings(updated));
});
