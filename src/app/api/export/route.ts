import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Download a JSON backup of everything in your local database. */
export const GET = handler(async () => {
  const [settings, goals, tasks, sessions, dsa, skills, checklist, questions, notes, rewards, applications] = await Promise.all([
    prisma.settings.findMany(),
    prisma.goal.findMany(),
    prisma.task.findMany(),
    prisma.studySession.findMany(),
    prisma.dsaProblem.findMany(),
    prisma.skill.findMany(),
    prisma.checklistItem.findMany(),
    prisma.interviewQuestion.findMany(),
    prisma.note.findMany(),
    prisma.reward.findMany(),
    prisma.jobApplication.findMany(),
  ]);
  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), settings, goals, tasks, sessions, dsa, skills, checklist, questions, notes, rewards, applications },
    null,
    2,
  );
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="navtracker-backup-${date}.json"`,
    },
  });
});
