import { format } from "date-fns";
import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Your "interview-notes.md" revision bible (plan habit #1):
 * every note grouped by topic + every interview question with your answer.
 * Add ?interview=1 to export only interview-prep notes.
 */
export const GET = handler(async (req: Request) => {
  const onlyInterview = new URL(req.url).searchParams.get("interview") === "1";
  const [notes, questions] = await Promise.all([
    prisma.note.findMany({
      where: onlyInterview ? { isInterview: true } : {},
      orderBy: [{ topic: "asc" }, { pinned: "desc" }, { title: "asc" }],
    }),
    prisma.interviewQuestion.findMany({ include: { skill: true }, orderBy: [{ skillId: "asc" }, { id: "asc" }] }),
  ]);

  const lines: string[] = [`# Interview notes`, ``, `_Exported ${format(new Date(), "d MMM yyyy, h:mm a")} from NavTracker_`, ``];

  let topic = "";
  for (const n of notes) {
    if (n.topic !== topic) {
      topic = n.topic;
      lines.push(`## ${topic}`, ``);
    }
    lines.push(`### ${n.title}`, ``, n.content, ``);
    if (n.tags) lines.push(`_Tags: ${n.tags.split(",").join(", ")}_`, ``);
  }

  lines.push(`## Interview questions`, ``);
  let skill = "";
  for (const q of questions) {
    const s = q.skill?.name ?? "General";
    if (s !== skill) {
      skill = s;
      lines.push(`### ${skill}`, ``);
    }
    lines.push(`- [${q.confidence >= 4 ? "x" : " "}] **${q.question}** (confidence ${q.confidence}/5)`);
    if (q.answer) lines.push(`  - ${q.answer.replace(/\n/g, "\n    ")}`);
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-notes-${format(new Date(), "yyyy-MM-dd")}.md"`,
    },
  });
});
