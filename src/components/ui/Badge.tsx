import { cn } from "@/lib/client";
import { DIFFICULTY_STYLES, PRIORITY_STYLES, SKILL_COLOR_HEX } from "@/lib/constants";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("chip bg-black/5 text-ink-soft dark:bg-white/10 dark:text-zinc-300", className)}>{children}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <span className={cn("chip", PRIORITY_STYLES[priority])}>{priority.toLowerCase()}</span>;
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return <span className={cn("chip", DIFFICULTY_STYLES[difficulty])}>{difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}</span>;
}

export function SkillDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", className)} style={{ background: SKILL_COLOR_HEX[color] ?? color }} />;
}
