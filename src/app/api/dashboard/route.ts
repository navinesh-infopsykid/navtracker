import { handler, ok } from "@/lib/api";
import { computeDashboard } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const GET = handler(async () => ok(await computeDashboard()));
