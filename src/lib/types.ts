// Shapes returned by the API. Dates arrive as ISO strings over JSON.

export interface SettingsDTO {
  id: number;
  name: string;
  dailyTargetMinutes: number;
  dayTargets: string;
  dailyLimitMinutes: number;
  streakMinMinutes: number;
  dailyDsaTarget: number;
  workingDays: string;
  planStartDate: string;
  planWeeks: number;
  mainGoal: string;
  theme: "light" | "dark" | "system";
  accent: string;
}

export interface TaskDTO {
  id: number;
  title: string;
  notes: string | null;
  priority: string;
  estimatedMinutes: number;
  actualMinutes?: number | null;
  deadline: string | null;
  completed: boolean;
  completedAt: string | null;
  goalId: number | null;
  goal?: { id: number; title: string } | null;
  createdAt: string;
}

export interface GoalDTO {
  id: number;
  title: string;
  description: string | null;
  timeframe: string;
  category: string;
  priority: string;
  status: string;
  deadline: string | null;
  completedAt: string | null;
  parentId: number | null;
  parent?: { id: number; title: string } | null;
  tasks: TaskDTO[];
  createdAt: string;
}

export interface SessionDTO {
  id: number;
  date: string;
  minutes: number;
  topic: string;
  notes: string | null;
  focus: number;
  skillId: number | null;
  skill?: { id: number; name: string; color: string } | null;
}

export interface DsaDTO {
  id: number;
  title: string;
  url: string | null;
  platform: string;
  topic: string;
  difficulty: string;
  status: string;
  language: string;
  code: string | null;
  approach: string | null;
  timeComplexity: string | null;
  spaceComplexity: string | null;
  starred: boolean;
  solvedAt: string;
  nextRevision: string | null;
  revisionCount: number;
}

export interface ChecklistItemDTO {
  id: number;
  text: string;
  done: boolean;
  skillId: number;
}

export interface QuestionDTO {
  id: number;
  question: string;
  answer: string | null;
  difficulty: string;
  confidence: number;
  lastReviewed: string | null;
  skillId: number | null;
  skill?: { id: number; name: string; color: string } | null;
}

export interface SkillDTO {
  id: number;
  name: string;
  category: string;
  level: number;
  color: string;
  description: string | null;
  notes: string | null;
  isCustom: boolean;
  checklist: ChecklistItemDTO[];
  _count?: { questions: number; topicNotes: number; sessions: number };
  minutes?: number;
}

export interface NoteDTO {
  id: number;
  title: string;
  content: string;
  topic: string;
  tags: string;
  pinned: boolean;
  isInterview: boolean;
  skillId: number | null;
  skill?: { id: number; name: string; color: string } | null;
  updatedAt: string;
}

export interface RewardDTO {
  id: number;
  title: string;
  emoji: string;
  description: string | null;
  targetXp: number;
  claimedAt: string | null;
  progress: number; // 0-100
  unlocked: boolean;
  remainingXp: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress: number; // 0-100
  current: number;
  target: number;
}

export interface RecoveryPlan {
  needed: boolean;
  headline: string;
  message: string;
  deficitMinutes: number;
  extraMinutesPerDay: number;
  overdueTasks: TaskDTO[];
  overdueGoals: { id: number; title: string; deadline: string | null; timeframe: string }[];
  steps: string[];
}

export interface DashboardDTO {
  settings: SettingsDTO;
  greeting: string;
  encouragement: string;
  today: {
    minutes: number;
    target: number;
    limit: number;
    isWorkingDay: boolean;
    tasksDone: number;
    tasksTotal: number;
    dsaSolved: number;
    dsaTarget: number;
  };
  totals: {
    todayMinutes: number;
    weekMinutes: number;
    monthMinutes: number;
    allMinutes: number;
    weekTarget: number;
    monthTarget: number;
    sessions: number;
  };
  completion: {
    todayTasks: number;
    weekTasks: number;
    goals: { timeframe: string; done: number; total: number; pct: number }[];
  };
  streak: { current: number; best: number; minMinutes: number };
  plan: { week: number; weeks: number; pct: number; daysLeft: number; expectedMinutes: number; actualMinutes: number; ended: boolean; started: boolean };
  charts: {
    daily: { label: string; date: string; minutes: number; target: number | null }[];
    weekly: { label: string; minutes: number; target: number; tasks: number }[];
    monthly: { label: string; hours: number; problems: number; tasks: number }[];
    heatmap: { date: string; minutes: number; level: number }[];
    topics: { name: string; minutes: number }[];
  };
  skills: { gained: number; total: number; avgLevel: number; checklistDone: number; checklistTotal: number; top: { name: string; level: number; color: string }[] };
  dsa: { total: number; easy: number; medium: number; hard: number; dueRevision: number; thisWeek: number };
  xp: { total: number; level: number; levelProgress: number; nextLevelXp: number };
  rewards: RewardDTO[];
  achievements: Achievement[];
  recovery: RecoveryPlan;
  focus: { id: number; title: string; description: string | null; done: number; total: number } | null;
  jobs: { total: number; thisWeek: number; interviewing: number; offers: number };
  upcomingTasks: TaskDTO[];
  recentSessions: SessionDTO[];
}

export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}

export interface JobApplicationDTO {
  id: number;
  company: string;
  role: string;
  companyType: string;
  channel: string;
  status: string;
  link: string | null;
  contact: string | null;
  expectedLpa: number | null;
  offeredLpa: number | null;
  appliedAt: string;
  nextStep: string | null;
  nextStepDate: string | null;
  notes: string | null;
}

export interface WeekDTO {
  settings: SettingsDTO;
  week: number;
  weeks: number;
  offset: number;
  isCurrent: boolean;
  start: string;
  end: string;
  goal: { id: number; title: string; description: string | null; status: string } | null;
  days: { date: string; target: number; studied: number; isToday: boolean; isPast: boolean }[];
  tasks: TaskDTO[];
  carryOver: TaskDTO[];
  ahead: TaskDTO[];
  stats: {
    weekTarget: number;
    studied: number;
    capacityLeft: number;
    plannedLeft: number;
    done: number;
    total: number;
    doneMinutes: number;
    plannedMinutes: number;
  };
}
