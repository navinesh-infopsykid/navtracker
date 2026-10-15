// Shared option lists used by forms, validation and badges.

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TIMEFRAMES = ["YEARLY", "MONTHLY", "WEEKLY", "DAILY"] as const;
export const GOAL_STATUSES = ["ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const DSA_STATUSES = ["TODO", "SOLVED", "ATTEMPTED", "REVISIT"] as const;
export const THEMES = ["light", "dark", "system"] as const;
export const ACCENTS = ["violet", "blue", "pink", "emerald", "orange"] as const;

export const APP_STATUSES = ["WISHLIST", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED", "WITHDRAWN"] as const;
export const COMPANY_TYPES = ["SERVICE", "STARTUP", "PRODUCT"] as const;
export const APP_CHANNELS = ["Referral", "LinkedIn", "Naukri", "Instahyre", "Wellfound", "Cutshort", "Career page", "Other"];

/** Weekly application targets from the plan (weeks 6+). */
export const WEEKLY_APP_TARGETS: { label: string; channels: string[]; target: number }[] = [
  { label: "Referrals", channels: ["Referral"], target: 5 },
  { label: "LinkedIn + Naukri", channels: ["LinkedIn", "Naukri"], target: 15 },
  { label: "Instahyre / Wellfound / Cutshort", channels: ["Instahyre", "Wellfound", "Cutshort"], target: 10 },
  { label: "Career pages", channels: ["Career page"], target: 3 },
];

export const APP_STATUS_STYLES: Record<string, string> = {
  WISHLIST: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  APPLIED: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  INTERVIEWING: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  OFFER: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  WITHDRAWN: "bg-zinc-500/10 text-zinc-500",
};

export const PLATFORMS = ["LeetCode", "GeeksforGeeks", "HackerRank", "Codeforces", "CodeChef", "InterviewBit", "NeetCode", "Other"];
export const LANGUAGES = ["TypeScript", "JavaScript", "Python", "Java", "C++", "Go", "SQL", "Other"];
export const DSA_TOPICS = [
  "Arrays", "Strings", "Hashing", "Two Pointers", "Sliding Window", "Stack", "Queue",
  "Linked List", "Binary Search", "Recursion", "Backtracking", "Trees", "BST", "Heap",
  "Graphs", "Dynamic Programming", "Greedy", "Bit Manipulation", "Math", "Trie", "Intervals", "Sorting", "JS Polyfills",
];
export const SKILL_CATEGORIES = ["Frontend", "Backend", "Language", "Database", "Fundamentals", "Interview", "Other"];
export const SKILL_COLORS = ["violet", "blue", "cyan", "emerald", "amber", "orange", "pink", "red", "indigo", "slate"] as const;

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** XP rules - shown in the UI so the reward system is transparent. */
export const XP_RULES = {
  perStudyMinutes: 10, // 1 XP per 10 minutes studied
  task: 10,
  goal: 50,
  dsa: { EASY: 10, MEDIUM: 20, HARD: 35 } as Record<string, number>,
  checklistItem: 5,
};

export const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  MEDIUM: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  HIGH: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  URGENT: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

export const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  HARD: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

export const SKILL_COLOR_HEX: Record<string, string> = {
  violet: "#8b5cf6",
  blue: "#0a84ff",
  cyan: "#06b6d4",
  emerald: "#10b981",
  amber: "#f59e0b",
  orange: "#f97316",
  pink: "#ec4899",
  red: "#ef4444",
  indigo: "#6366f1",
  slate: "#64748b",
};

/** Hex versions of the accent palettes (charts need real colors, not CSS variables). */
export const ACCENT_HEX: Record<string, { main: string; alt: string }> = {
  violet: { main: "#8b5cf6", alt: "#ec4899" },
  blue: { main: "#0a84ff", alt: "#06b6d4" },
  pink: { main: "#ec4899", alt: "#f97316" },
  emerald: { main: "#10b981", alt: "#0ea5e9" },
  orange: { main: "#f97316", alt: "#ef4444" },
};

/** Apple Fitness-style ring colors */
export const RING_COLORS = {
  study: { color: "#ff2d55", colorTo: "#ff6482" },
  tasks: { color: "#30d158", colorTo: "#a6ff00" },
  dsa: { color: "#0a84ff", colorTo: "#40e0ff" },
};
