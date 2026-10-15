/**
 * NavTracker starter data — built from "MERN Full Stack Job Switch Plan" (15 Oct 2026).
 *
 * This is NOT fake progress: there are no study sessions, no solved problems and nothing ticked off.
 * It loads your real plan so you can start tracking from day 1:
 *   • Life + career goals, 4 phases, 12 weekly goals with ~10 tasks each (deadlines spread across each week)
 *   • Health and "help people" habits, applications tasks from week 6
 *   • 15 skills with prep checklists, the DSA problem list (as "to do"), the interview question checklist
 *   • Recap notes for everything in the plan (analogies, routine, stories, negotiation, frameworks…)
 *   • Dream rewards: Apple Watch, iPhone, MacBook, Mustang
 *
 * Run:  npx prisma db seed
 * The plan starts on the day you run it. To start on a specific date:  PLAN_START=2026-10-19 npx prisma db seed
 * ⚠️ Seeding wipes the database first — run it once at the start, not after you've logged progress.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const noon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
const addDays = (d: Date, n: number) => noon(new Date(d.getTime() + n * DAY));

function planStartDate() {
  const env = process.env.PLAN_START;
  if (env && /^\d{4}-\d{2}-\d{2}$/.test(env)) {
    const [y, m, d] = env.split("-").map(Number);
    return new Date(y, m - 1, d, 12);
  }
  return noon(new Date());
}

const START = planStartDate();
const weekStart = (w: number) => addDays(START, (w - 1) * 7);
const weekEnd = (w: number) => addDays(START, (w - 1) * 7 + 6);
/** Date inside plan week `w` that falls on weekday `dow` (0 = Sun … 6 = Sat). */
function dayInWeek(w: number, dow: number) {
  const s = weekStart(w);
  for (let i = 0; i < 7; i++) {
    const d = addDays(s, i);
    if (d.getDay() === dow) return d;
  }
  return s;
}
/** Weekdays Mon–Thu inside week `w`, in date order (Friday = rest evening, weekend has its own tasks). */
function studyWeekdays(w: number) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart(w), i)).filter((d) => [1, 2, 3, 4].includes(d.getDay()));
}

async function main() {
  console.log("🧹 Clearing the database…");
  await prisma.$transaction([
    prisma.checklistItem.deleteMany(),
    prisma.interviewQuestion.deleteMany(),
    prisma.note.deleteMany(),
    prisma.studySession.deleteMany(),
    prisma.task.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.dsaProblem.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.reward.deleteMany(),
    prisma.jobApplication.deleteMany(),
    prisma.settings.deleteMany(),
  ]);

  // ───────────────────────── Settings ─────────────────────────
  // Plan: weekdays 3.5 h (DSA 1h + concept 1h15 + build 1h + recall 15m), weekends 6–7 h,
  // Friday = rest evening (morning DSA only).
  //            Sun  Mon  Tue  Wed  Thu  Fri  Sat
  const dayTargets = [390, 210, 210, 210, 210, 60, 390];
  await prisma.settings.create({
    data: {
      id: 1,
      name: "Navi",
      dayTargets: dayTargets.join(","),
      workingDays: "0,1,2,3,4,5,6",
      dailyTargetMinutes: Math.round(dayTargets.reduce((a, b) => a + b, 0) / 7),
      dailyLimitMinutes: 480,
      streakMinMinutes: 30,
      dailyDsaTarget: 2,
      planStartDate: START,
      planWeeks: 12,
      mainGoal: "Switch to a MERN full stack role (10–18 LPA) in 12 weeks",
      theme: "system",
      accent: "violet",
    },
  });

  // ───────────────────────── Rewards ─────────────────────────
  // ≈ 28 h/week of study + ~10 tasks + ~11 problems ≈ 450 XP/week if you follow the plan.
  await prisma.reward.createMany({
    data: [
      { title: "Apple Watch", emoji: "⌚️", targetXp: 1500, sortOrder: 0, description: "For your health — track workouts, sleep and heart. ~Week 4 if you stay consistent." },
      { title: "iPhone (latest)", emoji: "📱", targetXp: 3500, sortOrder: 1, description: "Interview-ready milestone. ~Week 8 — around your first offers." },
      { title: "MacBook (personal)", emoji: "💻", targetXp: 5500, sortOrder: 2, description: "The finish line of the 12-week plan. Your own machine for your own projects." },
      { title: "Ford Mustang", emoji: "🚗", targetXp: 25000, sortOrder: 3, description: "The long game: a year of consistency plus the salary jump. Keep showing up." },
    ],
  });

  // ───────────────────────── Skills ─────────────────────────
  // Levels are a starting guess for 3 years of Flutter + React — drag the sliders to your honest level.
  const skillDefs: { name: string; category: string; level: number; color: string; description: string; checklist: string[] }[] = [
    {
      name: "JavaScript", category: "Language", level: 50, color: "amber",
      description: "Week 1–2: scope, closures, this, prototypes, async and polyfills.",
      checklist: [
        "Scope, hoisting, temporal dead zone", "Closures (data privacy, once, memoize)", "this, call / apply / bind",
        "Prototypes & prototypal inheritance", "Shallow vs deep copy; == vs ===", "Array methods: map, filter, reduce, sort",
        "Polyfills: map, filter, reduce, bind", "Debounce & throttle from scratch", "Event loop: call stack, microtasks vs macrotasks",
        "Callbacks → promises → async/await", "Promise.all / allSettled / race / any polyfills", "fetch + error handling",
      ],
    },
    {
      name: "TypeScript", category: "Language", level: 25, color: "blue",
      description: "Week 2 onwards: write all code in TS.",
      checklist: ["Basic types, unions, literal types", "Interfaces vs type aliases", "Generics & constraints", "Utility types (Partial, Pick, Omit, Record)", "Typing React props, hooks and API responses", "Strict mode in a real project"],
    },
    {
      name: "React", category: "Frontend", level: 55, color: "cyan",
      description: "Week 3: React in depth + machine coding.",
      checklist: [
        "Reconciliation & virtual DOM", "Keys (and why index as key breaks)", "Re-render rules", "useEffect pitfalls & cleanup",
        "useMemo / useCallback / React.memo", "Custom hooks (useFetch, useDebounce)", "Context vs Redux Toolkit vs Zustand",
        "React Query for server state", "Code splitting & lazy loading", "Forms: controlled vs uncontrolled", "Accessibility basics",
        "SSR vs CSR vs SSG (what Next.js adds)",
      ],
    },
    {
      name: "Node.js & Express", category: "Backend", level: 20, color: "emerald",
      description: "Week 4: Node internals + Express APIs.",
      checklist: [
        "Node event loop & libuv", "Streams (large files)", "CommonJS vs ES modules", "Express routing", "Middleware chain (auth + logging)",
        "Centralized error handling", "Validation with Zod", "REST design: status codes, PUT vs PATCH", "Pagination, versioning, idempotency",
        "CPU-heavy work: worker threads / queues",
      ],
    },
    {
      name: "MongoDB", category: "Database", level: 15, color: "indigo",
      description: "Week 5: schema design, indexes, aggregation, transactions.",
      checklist: ["Schema design: embed vs reference", "Indexes & compound indexes", "Aggregation pipeline", "Transactions", "Mongoose models & validation"],
    },
    {
      name: "PostgreSQL / SQL", category: "Database", level: 15, color: "slate",
      description: "Week 5: many MERN job posts quietly want SQL too.",
      checklist: ["JOINs (inner, left, right, full)", "Normalization", "Indexes & EXPLAIN", "ACID & transactions", "SQL vs NoSQL: when to pick which"],
    },
    {
      name: "Auth & Security", category: "Backend", level: 15, color: "red",
      description: "Week 6: sessions, JWT, OAuth, RBAC and web security.",
      checklist: [
        "Sessions vs JWT", "Access + refresh tokens", "httpOnly cookies — where to store tokens", "bcrypt hashing & salts",
        "OAuth (Google login)", "RBAC (roles)", "CORS", "XSS & CSRF", "SQL / NoSQL injection", "Rate limiting & helmet",
      ],
    },
    {
      name: "Testing", category: "Backend", level: 10, color: "pink",
      description: "Week 6: Jest, Supertest, React Testing Library.",
      checklist: ["Jest basics (describe, it, mocks)", "API tests with Supertest", "React Testing Library", "Tests in the CI pipeline"],
    },
    {
      name: "Docker", category: "DevOps", level: 5, color: "blue",
      description: "Week 7: images, containers, compose.",
      checklist: ["Image vs container", "Dockerfile for a Node app (from memory)", "Multi-stage builds", "Volumes & networks", "docker-compose: app + Mongo + Redis"],
    },
    {
      name: "CI/CD & AWS", category: "DevOps", level: 10, color: "orange",
      description: "Week 8: GitHub Actions, AWS basics, Nginx, HTTPS.",
      checklist: [
        "GitHub Actions: lint → test → build → deploy", "AWS EC2 basics", "S3 + CloudFront for the React app", "Env variables & secrets",
        "Nginx as reverse proxy", "HTTPS", "Logs & monitoring basics", "Cheap path: Vercel + Render/Railway",
      ],
    },
    {
      name: "Redis, Queues & Real-time", category: "Backend", level: 5, color: "red",
      description: "Week 9: caching, BullMQ, Socket.IO, S3 uploads.",
      checklist: ["Cache-aside, TTL, invalidation", "BullMQ job queues", "WebSockets with Socket.IO", "S3 uploads with pre-signed URLs", "Measure API time before/after Redis"],
    },
    {
      name: "System Design", category: "Fundamentals", level: 5, color: "violet",
      description: "Weeks 10–11: fundamentals + designing out loud.",
      checklist: [
        "Vertical vs horizontal scaling", "Load balancers", "Caching layers & CDN", "Replication & sharding", "CAP theorem & consistency",
        "Message queues", "Rate limiting & API gateway", "Monolith vs microservices", "Design: URL shortener", "Design: chat app",
        "Design: notification system", "Design: e-commerce checkout", "Design: news feed", "Frontend design: autocomplete, infinite feed, dashboard",
      ],
    },
    {
      name: "LLD & Patterns", category: "Fundamentals", level: 10, color: "indigo",
      description: "Week 11: SOLID and a few patterns.",
      checklist: ["SOLID principles", "Singleton", "Factory", "Observer", "Strategy"],
    },
    {
      name: "DSA", category: "Fundamentals", level: 10, color: "emerald",
      description: "~140 problems by pattern, in JavaScript. Recognise ~12 patterns.",
      checklist: [
        "Big-O + arrays & strings", "Hashing (Map/Set)", "Two pointers", "Sliding window", "Stack & queue", "Binary search", "Linked list",
        "Recursion + trees (DFS/BFS)", "Heap / priority queue", "Graphs (BFS/DFS)", "Backtracking", "Intro dynamic programming",
      ],
    },
    {
      name: "Behavioral & Negotiation", category: "Interview", level: 20, color: "pink",
      description: "Career narrative, 8 STAR stories, salary negotiation.",
      checklist: [
        "60-second career narrative", "Story 1: learning a new stack fast", "Story 2: performance fix", "Story 3: production bug under pressure",
        "Story 4: disagreement with a teammate", "Story 5: ownership beyond your role", "Story 6: unclear requirements", "Story 7: a mistake you made",
        "Story 8: QuickBite design decision", "\"Why leave?\" answer", "Expected CTC script (market-based)", "Questions to ask the interviewer",
      ],
    },
  ];

  const skills: Record<string, number> = {};
  for (const [i, s] of skillDefs.entries()) {
    const created = await prisma.skill.create({
      data: {
        name: s.name, category: s.category, level: s.level, color: s.color, description: s.description, sortOrder: i,
        checklist: { create: s.checklist.map((text, idx) => ({ text, sortOrder: idx })) },
      },
    });
    skills[s.name] = created.id;
  }

  // ───────────────────────── Goals ─────────────────────────
  const in12 = weekEnd(12);
  const yearEnd = new Date(START.getFullYear() + 1, START.getMonth(), START.getDate(), 12);

  const career = await prisma.goal.create({
    data: {
      title: "Switch to a MERN full stack role (10–18 LPA)",
      timeframe: "YEARLY", category: "Career", priority: "URGENT", deadline: addDays(in12, 21),
      description:
        "You are underpaid, not under-skilled. Target funded startups & product SMBs first (10–18 LPA), service companies (6–10 LPA) as backup offers, strong product companies (18–30 LPA) as a stretch. Apply from week 6.",
    },
  });
  const healthy = await prisma.goal.create({
    data: {
      title: "Become healthy", timeframe: "YEARLY", category: "Health", priority: "HIGH", deadline: yearEnd,
      description: "Move every week, sleep well, protect your energy. Burnout in week 5 kills more plans than lack of talent.",
    },
  });
  const helpPeople = await prisma.goal.create({
    data: {
      title: "Help people in need", timeframe: "YEARLY", category: "Purpose", priority: "HIGH", deadline: yearEnd,
      description: "Donate, volunteer or mentor — at least once a month. The salary jump makes it possible to give more.",
    },
  });
  await prisma.goal.create({
    data: {
      title: "Get an Apple Watch for health", timeframe: "YEARLY", category: "Dreams", priority: "MEDIUM", parentId: healthy.id, deadline: addDays(in12, 0),
      description: "Unlocks in Rewards at 1,500 XP. Use it to track workouts and sleep for the health goal.",
    },
  });
  await prisma.goal.create({
    data: {
      title: "Buy the latest iPhone", timeframe: "YEARLY", category: "Dreams", priority: "MEDIUM", deadline: addDays(in12, 60),
      description: "Unlocks in Rewards at 3,500 XP. Fund it from the new salary, not from savings.",
    },
  });
  await prisma.goal.create({
    data: {
      title: "Buy a MacBook for personal use", timeframe: "YEARLY", category: "Dreams", priority: "MEDIUM", deadline: addDays(in12, 90),
      description: "Unlocks in Rewards at 5,500 XP — the end of the 12-week plan. Your own machine for side projects.",
    },
  });
  await prisma.goal.create({
    data: {
      title: "Get a Ford Mustang", timeframe: "YEARLY", category: "Dreams", priority: "LOW",
      deadline: new Date(START.getFullYear() + 4, START.getMonth(), START.getDate(), 12),
      description: "The long game. Unlocks in Rewards at 25,000 XP. Every offer you negotiate well brings it closer — start a dedicated savings fund after the switch.",
    },
  });
  await prisma.goal.create({
    data: {
      title: "Daily non-negotiables", timeframe: "DAILY", category: "Routine", priority: "HIGH",
      description: "6:30–7:30 AM: 2 DSA problems · 8:30–9:45 PM: concept (read 30m, code 45m) · 9:45–10:45 PM: one commit to QuickBite · 10:45–11:00 PM: 5-line recall note (Notes → Daily recall). Friday evening = rest.",
    },
  });

  const phases = [
    { title: "Phase 1 — JavaScript & React depth", weeks: [1, 2, 3], desc: "Sharpen what you know." },
    { title: "Phase 2 — Backend & data", weeks: [4, 5, 6], desc: "Own the backend. Resume + applications start in week 6." },
    { title: "Phase 3 — Ship like a senior", weeks: [7, 8, 9], desc: "Docker, CI/CD, cloud, Redis, queues, real-time." },
    { title: "Phase 4 — Design & interviews", weeks: [10, 11, 12], desc: "System design, LLD, mocks, offers and negotiation." },
  ];
  const phaseIds: number[] = [];
  for (const p of phases) {
    const g = await prisma.goal.create({
      data: {
        title: p.title, timeframe: "MONTHLY", category: "Career", priority: "HIGH", parentId: career.id,
        deadline: weekEnd(p.weeks[p.weeks.length - 1]), description: p.desc,
      },
    });
    phaseIds.push(g.id);
  }

  // ───────────────────────── Weekly roadmap + tasks ─────────────────────────
  type W = {
    title: string;
    desc: string;
    concepts: [string, number][]; // title, minutes
    build: string;
    weekendBuild: string;
    dsa: [string, number]; // pattern task, problems count
    extra?: [string, number, string?][]; // title, minutes, priority
  };
  const weeks: W[] = [
    {
      title: "Week 1 — JavaScript core",
      desc: "Scope, hoisting, closures, this, prototypes, call/apply/bind, copies, ==/===, array methods. Write debounce, throttle, map and bind polyfills.",
      concepts: [
        ["Scope, hoisting & temporal dead zone (read 30m, code 45m)", 75],
        ["Closures + this + call / apply / bind", 75],
        ["Prototypes, shallow vs deep copy, == vs ===, array methods", 75],
        ["Write polyfills: debounce, throttle, Array.prototype.map, bind", 90],
      ],
      build: "QuickBite: create the React + TypeScript repo (Vite), README stub, first commits",
      weekendBuild: "QuickBite: menu page with static data + deploy a preview",
      dsa: ["DSA: Big-O + arrays & strings basics (12 easy)", 12],
      extra: [["Write your 60-second career narrative (draft)", 30, "MEDIUM"]],
    },
    {
      title: "Week 2 — Async JS + TypeScript",
      desc: "Event loop, callbacks → promises → async/await, Promise combinators + polyfills, fetch + errors. TS: types, interfaces, generics, utility types.",
      concepts: [
        ["Event loop: call stack, microtask vs macrotask + predict-the-output drills", 75],
        ["Callbacks → promises → async/await; fetch + error handling", 75],
        ["Polyfills: Promise.all / allSettled / race / any", 90],
        ["TypeScript: types, interfaces, generics, utility types", 75],
      ],
      build: "QuickBite: move everything to strict TypeScript, typed API layer",
      weekendBuild: "QuickBite: cart with typed state + restaurant listing",
      dsa: ["DSA: Hashing — Two Sum, Valid Anagram, Group Anagrams, Longest Consecutive (+8)", 12],
    },
    {
      title: "Week 3 — React in depth",
      desc: "Reconciliation, keys, re-render rules, useEffect pitfalls, memoization, custom hooks, state libraries, React Query, code splitting, forms, a11y. Machine coding practice.",
      concepts: [
        ["Reconciliation, virtual DOM, keys, re-render rules", 75],
        ["useEffect pitfalls, useMemo / useCallback / React.memo, custom hooks", 75],
        ["Context vs Redux Toolkit vs Zustand; React Query for server state", 75],
        ["Machine coding (60–90 min each): todo with filters, infinite scroll, debounced search", 240],
      ],
      build: "QuickBite: debounced search, lazy-loaded pages, forms + accessibility pass",
      weekendBuild: "QuickBite: big frontend push — menu, cart, search complete; deploy",
      dsa: ["DSA: Two pointers — Valid Palindrome, 3Sum, Container With Most Water (+7)", 10],
    },
    {
      title: "Week 4 — Node.js + Express",
      desc: "Node event loop & libuv, streams, modules; Express routing, middleware, centralized errors, Zod validation, REST design.",
      concepts: [
        ["Node event loop & libuv, streams, modules", 75],
        ["Express routing + middleware chain (write auth + logging middleware)", 75],
        ["Centralized error handling + validation with Zod", 75],
        ["REST design: status codes, PUT vs PATCH, pagination, versioning, idempotency", 75],
      ],
      build: "QuickBite API: restaurants, menu, orders with validation + error middleware",
      weekendBuild: "QuickBite: connect frontend to the API end to end",
      dsa: ["DSA: Sliding window — Best Time to Buy/Sell Stock, Longest Substring Without Repeat (+8)", 10],
      extra: [["Sunday: first mock interview (Pramp / friend / record yourself) + 1 h resume", 120, "HIGH"]],
    },
    {
      title: "Week 5 — Databases",
      desc: "MongoDB schema design, indexes, aggregation, transactions. PostgreSQL basics: joins, normalization, indexes, ACID.",
      concepts: [
        ["MongoDB schema design: embed vs reference + indexes", 75],
        ["Aggregation pipeline + transactions", 75],
        ["PostgreSQL: joins, normalization, indexes, ACID", 75],
        ["Write all 8 STAR stories in interview notes (Notes → Stories)", 90],
      ],
      build: "QuickBite: Mongo models with indexes; order history via aggregation",
      weekendBuild: "QuickBite: admin view of orders + seed data",
      dsa: ["DSA: Stack & queue — Valid Parentheses, Min Stack, Daily Temperatures (+7)", 10],
      extra: [["Sunday: mock interview + 1 h resume / applications prep", 120, "HIGH"]],
    },
    {
      title: "Week 6 — Auth, security, testing (start applying!)",
      desc: "Sessions vs JWT, access + refresh tokens, httpOnly cookies, bcrypt, OAuth, RBAC. CORS, XSS, CSRF, injection, rate limiting, helmet. Jest + Supertest, RTL.",
      concepts: [
        ["Sessions vs JWT, access + refresh tokens, httpOnly cookies, bcrypt", 75],
        ["OAuth (Google login) + RBAC", 75],
        ["Security: CORS, XSS, CSRF, injection, rate limiting, helmet", 75],
        ["Testing: Jest + Supertest for APIs, React Testing Library", 75],
      ],
      build: "QuickBite: signup/login with access + refresh tokens, roles (customer, restaurant, admin), Jest tests",
      weekendBuild: "QuickBite: auth-protected flows + test coverage; deploy",
      dsa: ["DSA: Binary search — Search in Rotated Array, Koko Eating Bananas (+8)", 10],
      extra: [
        ["Update resume: 1 page, \"Full Stack Developer (MERN) — 3 years\", measurable bullets, QuickBite links", 120, "URGENT"],
        ["Set LinkedIn + Naukri to \"open to work\"; refresh profile", 45, "HIGH"],
        ["Apply: service companies + smaller startups (treat interviews as paid practice)", 180, "HIGH"],
      ],
    },
    {
      title: "Week 7 — Docker",
      desc: "Images vs containers, Dockerfile, multi-stage builds, volumes, networks, docker-compose for app + Mongo + Redis.",
      concepts: [
        ["Images vs containers; write a Dockerfile for a Node app from memory", 75],
        ["Multi-stage builds", 75],
        ["Volumes & networks", 60],
        ["docker-compose for web + API + Mongo + Redis", 75],
      ],
      build: "QuickBite: multi-stage Dockerfile + docker-compose (one `docker compose up`)",
      weekendBuild: "QuickBite: everything runs in containers locally; document it in README",
      dsa: ["DSA: Linked list — Reverse List, Merge Two Lists, Detect Cycle (+7)", 10],
    },
    {
      title: "Week 8 — CI/CD + cloud deploy",
      desc: "GitHub Actions (lint → test → build → deploy), AWS basics (EC2, S3 + CloudFront), env vars & secrets, Nginx, HTTPS, logs.",
      concepts: [
        ["GitHub Actions: lint → test → build → deploy", 75],
        ["AWS basics: EC2, S3 + CloudFront for the React app", 75],
        ["Env variables & secrets; Nginx reverse proxy; HTTPS", 75],
        ["Logs & monitoring basics", 60],
      ],
      build: "QuickBite: CI pipeline + deploy (Vercel + Render, or S3/CloudFront + EC2 behind Nginx)",
      weekendBuild: "QuickBite: live link + GitHub link at the top of your resume",
      dsa: ["DSA: Recursion + trees — Max Depth, Invert Tree, Level Order (+5)", 8],
      extra: [["Apply: target startups & product companies (switch focus now)", 120, "HIGH"]],
    },
    {
      title: "Week 9 — Real-time & scale tools",
      desc: "Redis caching (cache-aside, TTL, invalidation), BullMQ queues, WebSockets (Socket.IO), S3 uploads with pre-signed URLs.",
      concepts: [
        ["Redis caching: cache-aside, TTL, invalidation", 75],
        ["Job queues with BullMQ (emails / notifications)", 75],
        ["WebSockets with Socket.IO", 75],
        ["File uploads to S3 with pre-signed URLs", 60],
      ],
      build: "QuickBite: Redis menu cache, BullMQ order emails, Socket.IO live order status, S3 image upload",
      weekendBuild: "QuickBite: measure API response time before/after Redis — put the numbers in README",
      dsa: ["DSA: Trees part 2 — LCA, Validate BST (+5) and Heap — Kth Largest, Top K Frequent, Merge K Lists", 15],
    },
    {
      title: "Week 10 — System design fundamentals",
      desc: "Scaling, load balancers, caching, CDN, replication, sharding, CAP, queues, rate limiting, API gateway, monolith vs microservices.",
      concepts: [
        ["Vertical vs horizontal scaling, load balancers, caching layers, CDN", 75],
        ["Replication, sharding, CAP theorem, consistency", 75],
        ["Message queues, rate limiting, API gateway", 75],
        ["Monolith vs microservices; practice the 7-step design framework", 75],
      ],
      build: "QuickBite README: architecture diagram, scaling plan, trade-offs you made",
      weekendBuild: "Design out loud: \"Scale QuickBite to 1 million users\" (record yourself)",
      dsa: ["DSA: Graphs — Number of Islands, Clone Graph, Course Schedule (+7)", 10],
    },
    {
      title: "Week 11 — Design practice + LLD",
      desc: "Design out loud: URL shortener, chat, notifications, checkout, news feed. Frontend design: autocomplete, infinite feed, dashboard. LLD: SOLID + patterns.",
      concepts: [
        ["Design out loud: URL shortener + chat app", 90],
        ["Design out loud: notification system, e-commerce checkout, news feed", 90],
        ["Frontend system design: autocomplete, infinite feed, dashboard", 75],
        ["LLD: SOLID + singleton, factory, observer, strategy", 75],
      ],
      build: "Machine-coding repo: 3 of the 10 components (autocomplete, modal, infinite scroll)",
      weekendBuild: "Line up final rounds so offers land in the same 2–3 weeks",
      dsa: ["DSA: Backtracking — Subsets, Permutations, Combination Sum (+5)", 8],
    },
    {
      title: "Week 12 — Polish & close",
      desc: "3 full mock interviews, revise interview-notes.md, rehearse STAR stories, negotiate offers.",
      concepts: [
        ["Full mock interview #1 (JS + React)", 90],
        ["Full mock interview #2 (backend + system design)", 90],
        ["Full mock interview #3 (DSA + behavioural)", 90],
        ["Revise interview-notes.md (Notes → export) + rehearse all 8 STAR stories out loud", 120],
      ],
      build: "Final polish: resume, LinkedIn, QuickBite README and live demo",
      weekendBuild: "Negotiate offers: market-based number, use competing offers, compare fixed pay",
      dsa: ["DSA: Intro DP — Climbing Stairs, House Robber, Coin Change, LIS (+8)", 12],
    },
  ];

  const phaseOf = (w: number) => phaseIds[Math.floor((w - 1) / 3)];
  let taskCount = 0;

  for (const [i, wk] of weeks.entries()) {
    const w = i + 1;
    const goal = await prisma.goal.create({
      data: { title: wk.title, description: wk.desc, timeframe: "WEEKLY", category: "Career", priority: "HIGH", parentId: phaseOf(w), deadline: weekEnd(w) },
    });
    const days = studyWeekdays(w);
    const sat = dayInWeek(w, 6);
    const sun = dayInWeek(w, 0);
    const tasks: { title: string; est: number; deadline: Date; priority: string; notes?: string }[] = [];

    // Weekday rhythm (Mon–Thu): DSA 6:30–7:30 AM · concept 8:30–9:45 PM · build 9:45–10:45 PM
    const pattern = wk.dsa[0].replace(/^DSA:\s*/, "");
    days.forEach((day, idx) => {
      tasks.push({ title: `DSA: 2 problems — ${pattern}`, est: 60, deadline: day, priority: "HIGH", notes: "6:30–7:30 AM. 25-minute rule. Log each one in the DSA Tracker." });
      const concept = wk.concepts[idx];
      if (concept) tasks.push({ title: concept[0], est: concept[1], deadline: day, priority: "HIGH", notes: "8:30–9:45 PM: read/watch 30 min, then code it yourself. End with a 5-line recall note + analogy." });
      tasks.push({ title: `Build: ${wk.build}`, est: 60, deadline: day, priority: "MEDIUM", notes: "9:45–10:45 PM — push one commit." });
    });
    // Friday = rest evening: morning DSA only
    tasks.push({ title: `Friday: 2 DSA problems (${pattern.split(" — ")[0]}) — then rest`, est: 60, deadline: dayInWeek(w, 5), priority: "MEDIUM", notes: "Rest evening. Burnout in week 5 kills more plans than lack of talent." });
    tasks.push({ title: "Saturday: 3–4 DSA problems + re-solve 2 old ones without looking", est: 180, deadline: sat, priority: "MEDIUM" });
    tasks.push({ title: `Saturday: ${wk.weekendBuild}`, est: 210, deadline: sat, priority: "MEDIUM" });
    tasks.push({
      title: "Sunday: revise the week's notes + explain each concept out loud (Feynman test)",
      est: 180, deadline: sun, priority: "MEDIUM",
    });
    for (const [title, est, pr] of wk.extra ?? []) tasks.push({ title, est, deadline: w >= 4 && title.startsWith("Sunday") ? sun : weekEnd(w), priority: pr ?? "MEDIUM" });
    if (w >= 6 && w <= 11) {
      tasks.push({ title: "Sunday: one mock interview (Pramp / friend / record yourself) + review what to fix", est: 120, deadline: sun, priority: "HIGH" });
    }
    if (w >= 6) {
      tasks.push({
        title: "Applications this week: 5 referrals · 15 LinkedIn/Naukri · 10 Instahyre/Wellfound/Cutshort · 3 career pages",
        est: 240, deadline: weekEnd(w), priority: "HIGH", notes: "Log each one in Applications so the weekly targets fill up.",
      });
    }

    for (const t of tasks) {
      await prisma.task.create({
        data: { title: t.title, estimatedMinutes: t.est, deadline: t.deadline, priority: t.priority, notes: t.notes ?? null, goalId: goal.id },
      });
      taskCount++;
    }

    // Health habit every week
    await prisma.task.create({
      data: {
        title: `Health (week ${w}): 3 workouts or 30-min walks · 7 h sleep on 5 nights`,
        estimatedMinutes: 120, deadline: weekEnd(w), priority: "MEDIUM", goalId: healthy.id,
        notes: "One rest evening per week (Friday). Energy is part of the plan.",
      },
    });
    taskCount++;
    // Help people once every 4 weeks
    if (w % 4 === 0) {
      await prisma.task.create({
        data: {
          title: `Help someone in need this month (donate, volunteer, or mentor a junior dev)`,
          estimatedMinutes: 60, deadline: weekEnd(w), priority: "MEDIUM", goalId: helpPeople.id,
        },
      });
      taskCount++;
    }
  }

  // ───────────────────────── DSA problem list (to do) ─────────────────────────
  // Planned date = end of the week the pattern is scheduled. Mark solved from the DSA page.
  const lc = (slug: string) => `https://leetcode.com/problems/${slug}/`;
  const problems: [string, string, string, string, number][] = [
    // title, slug, topic, difficulty, plan week
    ["Contains Duplicate", "contains-duplicate", "Arrays", "EASY", 1],
    ["Two Sum", "two-sum", "Hashing", "EASY", 2],
    ["Valid Anagram", "valid-anagram", "Hashing", "EASY", 2],
    ["Group Anagrams", "group-anagrams", "Hashing", "MEDIUM", 2],
    ["Longest Consecutive Sequence", "longest-consecutive-sequence", "Hashing", "MEDIUM", 2],
    ["Valid Palindrome", "valid-palindrome", "Two Pointers", "EASY", 3],
    ["3Sum", "3sum", "Two Pointers", "MEDIUM", 3],
    ["Container With Most Water", "container-with-most-water", "Two Pointers", "MEDIUM", 3],
    ["Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", "Sliding Window", "EASY", 4],
    ["Longest Substring Without Repeating Characters", "longest-substring-without-repeating-characters", "Sliding Window", "MEDIUM", 4],
    ["Valid Parentheses", "valid-parentheses", "Stack", "EASY", 5],
    ["Min Stack", "min-stack", "Stack", "MEDIUM", 5],
    ["Daily Temperatures", "daily-temperatures", "Stack", "MEDIUM", 5],
    ["Search in Rotated Sorted Array", "search-in-rotated-sorted-array", "Binary Search", "MEDIUM", 6],
    ["Koko Eating Bananas", "koko-eating-bananas", "Binary Search", "MEDIUM", 6],
    ["Reverse Linked List", "reverse-linked-list", "Linked List", "EASY", 7],
    ["Merge Two Sorted Lists", "merge-two-sorted-lists", "Linked List", "EASY", 7],
    ["Linked List Cycle", "linked-list-cycle", "Linked List", "EASY", 7],
    ["Maximum Depth of Binary Tree", "maximum-depth-of-binary-tree", "Trees", "EASY", 8],
    ["Invert Binary Tree", "invert-binary-tree", "Trees", "EASY", 8],
    ["Binary Tree Level Order Traversal", "binary-tree-level-order-traversal", "Trees", "MEDIUM", 8],
    ["Lowest Common Ancestor of a BST", "lowest-common-ancestor-of-a-binary-search-tree", "BST", "MEDIUM", 9],
    ["Validate Binary Search Tree", "validate-binary-search-tree", "BST", "MEDIUM", 9],
    ["Kth Largest Element in an Array", "kth-largest-element-in-an-array", "Heap", "MEDIUM", 9],
    ["Top K Frequent Elements", "top-k-frequent-elements", "Heap", "MEDIUM", 9],
    ["Merge k Sorted Lists", "merge-k-sorted-lists", "Heap", "HARD", 9],
    ["Number of Islands", "number-of-islands", "Graphs", "MEDIUM", 10],
    ["Clone Graph", "clone-graph", "Graphs", "MEDIUM", 10],
    ["Course Schedule", "course-schedule", "Graphs", "MEDIUM", 10],
    ["Subsets", "subsets", "Backtracking", "MEDIUM", 11],
    ["Permutations", "permutations", "Backtracking", "MEDIUM", 11],
    ["Combination Sum", "combination-sum", "Backtracking", "MEDIUM", 11],
    ["Climbing Stairs", "climbing-stairs", "Dynamic Programming", "EASY", 12],
    ["House Robber", "house-robber", "Dynamic Programming", "MEDIUM", 12],
    ["Coin Change", "coin-change", "Dynamic Programming", "MEDIUM", 12],
    ["Longest Increasing Subsequence", "longest-increasing-subsequence", "Dynamic Programming", "MEDIUM", 12],
    ["LRU Cache", "lru-cache", "JS Polyfills", "MEDIUM", 9],
  ];
  for (const [title, slug, topic, difficulty, w] of problems) {
    await prisma.dsaProblem.create({
      data: { title, url: lc(slug), platform: "LeetCode", topic, difficulty, status: "TODO", language: "JavaScript", solvedAt: weekEnd(w) },
    });
  }
  // JS-specific questions Indian product companies ask instead of hard DSA
  const jsQs: [string, number, string][] = [
    ["Polyfill: Array.prototype.map / filter / reduce", 1, "Write each on Array.prototype; handle thisArg and sparse arrays; reduce without initial value uses arr[0]."],
    ["Polyfill: Function.prototype.bind", 1, "Return a function that calls the original with fixed this + pre-filled args; support `new`."],
    ["Polyfill: Promise.all", 2, "Return a new Promise; resolve when all resolve (keep order), reject on first rejection; empty array resolves []."],
    ["Implement debounce and throttle", 1, "Debounce: clearTimeout + setTimeout. Throttle: timestamp or flag; fire at most once per N ms."],
    ["Flatten a nested array / object", 2, "Recursion or a stack; for objects build 'a.b.c' keys."],
    ["Deep clone (handle arrays, dates, cycles)", 2, "Recursive copy with a WeakMap for seen objects; mention structuredClone."],
    ["Implement an event emitter (on, off, once, emit)", 4, "Map<event, Set<listener>>; once wraps and removes itself."],
    ["Memoize function", 2, "Cache keyed by JSON.stringify(args) or a Map; mention cache invalidation."],
    ["Curry function", 2, "Return a function collecting args until args.length >= fn.length."],
  ];
  for (const [title, w, approach] of jsQs) {
    await prisma.dsaProblem.create({
      data: { title, platform: "Other", topic: "JS Polyfills", difficulty: "MEDIUM", status: "TODO", language: "JavaScript", approach, solvedAt: weekEnd(w) },
    });
  }

  // ───────────────────────── Interview questions (from the checklist) ─────────────────────────
  // Confidence starts at 1. Tick (4+) only when you can answer out loud in under 2 minutes with an example.
  const Q: [string, string, string, string][] = [
    // skill, question, answer, difficulty
    ["JavaScript", "Explain closures with a real use (data privacy, once(), memoize).", "A function keeps access to its lexical scope after the outer function returns — like a backpack it carries from home. Uses: private counters, once(), memoize, debounce timers.", "EASY"],
    ["JavaScript", "Walk through the event loop; predict output of mixed setTimeout/Promise code.", "Single call stack. Async work is offloaded; callbacks queue up. After each task the microtask queue (promises) drains fully, then the next macrotask (setTimeout). Analogy: one chef with a ticket rail; VIP orders (promises) first. log(1); setTimeout(2); Promise.then(3); log(4) → 1, 4, 3, 2.", "MEDIUM"],
    ["JavaScript", "var vs let vs const, hoisting, temporal dead zone.", "var is function-scoped and hoisted as undefined. let/const are block-scoped and hoisted but sit in the TDZ until declared. const prevents reassignment, not mutation. Analogy: attendance read before class, marks given later.", "EASY"],
    ["JavaScript", "this in normal vs arrow functions; call/apply/bind.", "Normal functions get `this` from how they're called; arrow functions take `this` from the enclosing scope. call(this, a, b), apply(this, [a, b]) invoke now; bind returns a new function with fixed this.", "MEDIUM"],
    ["JavaScript", "Write polyfills: map, filter, reduce, bind, Promise.all.", "Practise in the DSA tracker (JS Polyfills topic). Explain edge cases: thisArg, empty arrays, reduce without initial value, Promise.all order + first rejection.", "MEDIUM"],
    ["JavaScript", "Implement debounce and throttle.", "Debounce = lift door: waits until input stops for N ms (search box). Throttle = metro gate: at most once per N ms (scroll, resize).", "MEDIUM"],
    ["JavaScript", "Deep vs shallow copy; how to deep clone.", "Shallow copies top-level only (spread, Object.assign) — nested objects are shared. Deep clone: structuredClone, or recursive copy with a WeakMap for cycles. JSON trick loses dates/functions.", "EASY"],
    ["JavaScript", "Prototypal inheritance vs classes.", "Objects link to a prototype; property lookup walks the chain — like asking parent, then grandparent for a skill. Classes are syntax sugar over prototypes.", "MEDIUM"],
    ["React", "How reconciliation works; why keys matter (and why index as key can break).", "React diffs the new virtual tree with the old and patches minimal DOM — like editing only changed lines in a printed copy. Keys are roll numbers: stable identity across renders. Index keys break when items reorder/insert — state sticks to the wrong item.", "MEDIUM"],
    ["React", "When does a component re-render? How to prevent unnecessary ones?", "State change, parent re-render, or consumed context change. Prevent with React.memo, stable props via useCallback/useMemo, splitting context, moving state down, and lists virtualization.", "MEDIUM"],
    ["React", "useEffect dependency array and cleanup; common bugs.", "Runs after render to sync with external systems (\"after dinner, wash the dishes\"). Deps decide when it re-runs; cleanup runs before the next effect and on unmount. Bugs: missing deps (stale closures), objects in deps causing loops, no cleanup for subscriptions/timers, race conditions in fetches.", "MEDIUM"],
    ["React", "useMemo vs useCallback vs React.memo.", "useMemo caches a value, useCallback caches a function reference, React.memo skips re-rendering a component when props are shallow-equal. Sticky note with a long sum's answer.", "EASY"],
    ["React", "Context vs Redux vs Zustand vs React Query — when each.", "Context: app-wide, rarely changing data (theme, user) — the building intercom. Redux/Zustand: complex client state with predictable updates — the bank ledger. React Query: server state (caching, refetching, loading/error).", "MEDIUM"],
    ["React", "Controlled vs uncontrolled components.", "Controlled: React state is the source of truth (value + onChange). Uncontrolled: the DOM holds the value, read via ref. Controlled for validation and dynamic forms.", "EASY"],
    ["React", "Write a custom hook (useFetch, useDebounce).", "A function starting with `use` that composes hooks. useDebounce(value, delay): useState + useEffect with setTimeout and cleanup. useFetch: loading/error/data + AbortController on cleanup.", "MEDIUM"],
    ["React", "How you'd optimise a slow React page.", "Measure first (React DevTools Profiler, Lighthouse). Then: code splitting/lazy loading, memoization, virtualize long lists, avoid unnecessary context updates, debounce inputs, optimise images, cache server data. Give before/after numbers.", "MEDIUM"],
    ["React", "SSR vs CSR vs SSG (what Next.js adds).", "CSR renders in the browser; SSR renders HTML per request on the server; SSG pre-renders at build time. Next.js adds routing, SSR/SSG/ISR, server components and API routes — better SEO and first paint.", "MEDIUM"],
    ["Node.js & Express", "Node event loop and why Node suits I/O-heavy work.", "Single-threaded JS with libuv handling I/O asynchronously (thread pool + OS). It doesn't block while waiting on DB/network, so one process handles many concurrent connections. CPU-heavy work blocks it.", "MEDIUM"],
    ["Node.js & Express", "Middleware: write one for auth and one for logging.", "(req, res, next) functions in the pipeline that can modify, pass on, or end the request — like airport checkpoints. Auth: verify token, attach req.user or 401. Logging: record method/url/time, call next().", "MEDIUM"],
    ["Node.js & Express", "REST principles, status codes, PUT vs PATCH, pagination.", "Resources + HTTP verbs, stateless. Courier updates: 200 delivered, 201 booked, 400 wrong address, 401 no ID, 403 not allowed, 404 not found, 500 van broke. PUT replaces, PATCH partially updates. Pagination: limit/offset or cursor.", "EASY"],
    ["Node.js & Express", "Centralized error handling in Express.", "Throw/next(err) from routes (wrap async handlers), one final (err, req, res, next) middleware that logs and returns a consistent JSON shape with the right status.", "MEDIUM"],
    ["Node.js & Express", "Streams: when you'd use them (large files).", "Process data in chunks instead of loading it all into memory: file downloads/uploads, CSV processing, piping. readable.pipe(transform).pipe(writable) with backpressure.", "MEDIUM"],
    ["Node.js & Express", "How to handle CPU-heavy tasks (worker threads, queues).", "Don't block the event loop: move work to worker threads, a separate service, or a job queue (BullMQ) processed by workers.", "MEDIUM"],
    ["MongoDB", "SQL vs NoSQL: when to pick which.", "SQL: structured relations, joins, strong consistency, transactions (payments, orders). NoSQL: flexible schema, document reads, horizontal scale (catalogs, logs). Many apps use both.", "EASY"],
    ["MongoDB", "Mongo schema design: embed vs reference, with an example.", "Embed data read together and bounded (Aadhaar in your wallet: order items in an order). Reference large, shared or unbounded data (property papers in a locker: user → orders).", "MEDIUM"],
    ["MongoDB", "What an index is, how it speeds reads, its costs; compound indexes.", "Like a textbook index: a sorted structure that avoids scanning every document. Costs: slower writes, more storage. Compound index order matters (equality → sort → range).", "MEDIUM"],
    ["MongoDB", "Aggregation pipeline example.", "Stages transform documents: $match → $group → $sort → $project. E.g. orders: match last 30 days, group by restaurant summing totals, sort desc, limit 5.", "MEDIUM"],
    ["PostgreSQL / SQL", "ACID and transactions; SQL joins.", "All-or-nothing like a UPI transfer: Atomic, Consistent, Isolated, Durable. INNER JOIN = matches only; LEFT JOIN = all left rows with NULLs where no match.", "EASY"],
    ["Auth & Security", "Session vs JWT; where to store tokens and why.", "Session = coat check: server stores state, client holds an ID. JWT = movie ticket: self-contained, signed, verified without a DB lookup. Store tokens in httpOnly, Secure, SameSite cookies — not localStorage (XSS).", "MEDIUM"],
    ["Auth & Security", "Access + refresh token flow.", "Short-lived access token (daily visitor pass) on every request; long-lived refresh token (office ID card) in an httpOnly cookie is used to get a new access token. Rotate refresh tokens and revoke on logout.", "MEDIUM"],
    ["Auth & Security", "XSS, CSRF, CORS, injection — what and how to prevent.", "XSS: injected scripts → escape output, CSP, no dangerouslySetInnerHTML. CSRF: forged cross-site requests → SameSite cookies, CSRF tokens. CORS: browser blocks other origins unless allowed (apartment security). Injection: validate input, parameterized queries, sanitize Mongo operators.", "MEDIUM"],
    ["Auth & Security", "Password hashing with bcrypt and salts.", "One-way like making juice from fruit. bcrypt adds a random salt and is deliberately slow (cost factor). Store only the hash; compare with bcrypt.compare.", "EASY"],
    ["Docker", "Image vs container; write a Dockerfile for a Node app from memory.", "Image = recipe, container = the dish. FROM node:20-alpine, WORKDIR /app, COPY package*.json, RUN npm ci, COPY ., EXPOSE 3000, CMD [\"node\",\"server.js\"]. Multi-stage: build in one stage, ship only the output.", "MEDIUM"],
    ["Docker", "docker-compose for app + DB.", "Wedding planner for containers: services (api, web, mongo, redis), ports, env vars, volumes for data, depends_on. One `docker compose up`.", "EASY"],
    ["CI/CD & AWS", "Your CI/CD pipeline steps.", "On push/PR: install → lint → test → build → (on main) deploy. Assembly line with quality checks at every station. Secrets in the CI secret store.", "EASY"],
    ["CI/CD & AWS", "How you deploy React and Node to production; env variables and secrets.", "React build → S3 + CloudFront (or Vercel). Node → EC2/Render behind Nginx with HTTPS, process manager or container. Config via env vars per environment; secrets never in the repo.", "MEDIUM"],
    ["CI/CD & AWS", "What Nginx does as a reverse proxy.", "Office receptionist: single entry point that routes to the right service, terminates SSL, serves static files, can load-balance and cache.", "EASY"],
    ["System Design", "Design a URL shortener.", "Use the framework: requirements → scale → APIs (POST /shorten, GET /:code) → data model (code → url) → base62 IDs → cache hot codes in Redis → 301/302 redirect → analytics async → rate limiting.", "HARD"],
    ["System Design", "Design a chat app (WebSockets, message storage, online status).", "WebSocket gateway, message service, store messages by conversation (partitioned), delivery/read receipts, presence via heartbeats in Redis, push notifications for offline users, fan-out via pub/sub.", "HARD"],
    ["System Design", "Design a notification system (queues, retries).", "API enqueues events → queue → workers per channel (email/SMS/push) → retries with backoff + dead-letter queue → user preferences + templates → rate limits and idempotency keys.", "HARD"],
    ["System Design", "How to scale your QuickBite app to 1 million users.", "CDN for static assets, horizontal API instances behind a load balancer, Redis for menus, DB indexes + read replicas, queue for emails, Socket.IO with a Redis adapter, monitoring. Explain the bottleneck you'd hit first.", "HARD"],
    ["System Design", "Caching strategies and invalidation.", "Cache-aside (most common), write-through, write-back. TTLs, explicit invalidation on writes, versioned keys. Pre-cut vegetables: fast, but refresh them.", "MEDIUM"],
    ["System Design", "Rate limiter design.", "ATM with 5 withdrawals a day. Token bucket or sliding window counters in Redis keyed by user/IP; return 429 with Retry-After; place at API gateway.", "MEDIUM"],
    ["System Design", "Frontend design: autocomplete / infinite feed.", "Autocomplete: debounce input, cancel stale requests, cache results, keyboard navigation, a11y. Infinite feed: cursor pagination, IntersectionObserver, virtualization, skeletons, error retry.", "MEDIUM"],
    ["Behavioral & Negotiation", "Tell me about yourself (60 seconds).", "Use the career narrative note: 3 years, Flutter → React, what you shipped, backend deep-dive + QuickBite, looking for end-to-end ownership.", "EASY"],
    ["Behavioral & Negotiation", "Why are you leaving?", "\"I've grown a lot here, and I want a role with more full stack ownership and larger scale.\" Never criticise your current company.", "EASY"],
    ["Behavioral & Negotiation", "Hardest bug / technical challenge.", "Story 2 or 3 in STAR form — end with a number.", "MEDIUM"],
    ["Behavioral & Negotiation", "Conflict with a teammate.", "Story 4: listened, compared trade-offs with data, ran a small spike, agreed path, relationship stayed good.", "MEDIUM"],
    ["Behavioral & Negotiation", "A mistake and what you learned.", "Story 7: a real but recoverable mistake; spend most of the time on what you changed afterwards.", "MEDIUM"],
    ["Behavioral & Negotiation", "Where do you see yourself in 3 years?", "Owning features end to end, growing into system design and mentoring — at a company where you can grow with the product.", "EASY"],
    ["Behavioral & Negotiation", "Questions you'll ask them.", "Team size, tech stack, on-call, how success is measured in the first 6 months, what the last person in the role did well.", "EASY"],
  ];
  for (const [skill, question, answer, difficulty] of Q) {
    await prisma.interviewQuestion.create({ data: { question, answer, difficulty, confidence: 1, skillId: skills[skill] } });
  }

  // ───────────────────────── Recap notes ─────────────────────────
  const notes: { title: string; topic: string; skill?: string; tags: string; pinned?: boolean; interview?: boolean; content: string }[] = [
    {
      title: "My why — goals beyond the job", topic: "Planning", tags: "goals,motivation", pinned: true,
      content: `Career: switch to a MERN full stack role (10–18 LPA). You are underpaid, not under-skilled.

Life goals this plan funds:
• Help people in need — give, volunteer or mentor every month
• Become healthy — move, sleep, rest one evening a week
• Apple Watch — for health (1,500 XP)
• Latest iPhone (3,500 XP)
• MacBook for personal use (5,500 XP — end of the plan)
• Ford Mustang — the long game (25,000 XP)

On a bad day, read this note, then do just the next 25 minutes.`,
    },
    {
      title: "Strategy & target salary bands", topic: "Planning", tags: "strategy,salary", pinned: true,
      content: `Strengths: 3 years of production experience across mobile (Flutter) and web (React). Flutter skills (widgets, state, async) map directly to React.

Bands (Bengaluru, 3 YoE — verify on Glassdoor, AmbitionBox, Naukri):
• Service / mid IT: 6–10 LPA — React, Node, JS basics, a little SQL. Gap: small (4–6 weeks)
• Funded startups / product SMBs: 10–18 LPA — JS deep dive, machine coding, APIs, basic system design, easy–medium DSA. MAIN TARGET
• Strong product companies: 18–30 LPA — medium DSA, LLD, system design. Stretch

Strategy: target startups/SMBs first, service companies as backup offers, use every offer to negotiate the next.`,
    },
    {
      title: "Three rules + habits that make it stick", topic: "Planning", tags: "rules,habits", pinned: true,
      content: `Rules
1. Build, don't just watch. Every concept ends in code you wrote and can explain.
2. DSA every single day, small doses. 1 hour daily beats 7 hours on Sunday.
3. Apply early. Interviews are the best practice; the first 5 are for learning.

Habits
• One interview-notes file (Notes → export interview-notes.md) — your revision bible in week 12.
• Spaced revision: revisit each topic after 1 day, 1 week, 1 month. A 5-minute skim is enough.
• Feynman test: if you can't explain it to a non-tech friend with an analogy, you don't know it yet.
• One rest evening per week (Friday).
• Missing one day is fine; missing two is the start of quitting.`,
    },
    {
      title: "Daily & weekly routine", topic: "Planning", tags: "routine,schedule",
      content: `Weekdays (3.5 h)
• 6:30–7:30 AM  DSA — 2 problems
• 8:30–9:45 PM  Concept — read/watch 30 min, code it yourself 45 min
• 9:45–10:45 PM Build — one commit to QuickBite
• 10:45–11:00 PM Recall — 5 lines: what you learned, in your own words, + a real-life analogy (Notes → Daily recall)

Saturday: morning DSA 3–4 problems + re-solve 2 old ones without looking · afternoon big project push + deploy
Sunday: revise the week's notes, explain each concept out loud · from week 4: one mock interview + 1 h resume/applications
Friday evening: rest.

Targets in Settings: Mon–Thu 3.5 h, Fri 1 h, Sat–Sun 6.5 h ≈ 28 h/week.`,
    },
    {
      title: "12-week roadmap at a glance", topic: "Planning", tags: "roadmap",
      content: `Phase 1 — JavaScript & React depth
 W1 JavaScript core · W2 Async JS + TypeScript · W3 React in depth
Phase 2 — Backend & data
 W4 Node + Express · W5 Databases (Mongo + Postgres) · W6 Auth, security, testing — resume + START APPLYING
Phase 3 — Ship like a senior
 W7 Docker · W8 CI/CD + cloud deploy · W9 Redis, queues, WebSockets, S3
Phase 4 — Design & interviews
 W10 System design fundamentals · W11 Design practice + LLD · W12 Mocks, revision, negotiation

Every week has a weekly goal with its tasks in Goals & Tasks.`,
    },
    {
      title: "Master analogy: a full stack app is a restaurant", topic: "Analogies", tags: "analogy,architecture", pinned: true, interview: true,
      content: `• Frontend (React) = dining area and menu — what the customer sees and touches
• API (Express routes) = the waiter — takes a clear order in a fixed format, brings back a response
• Backend logic (Node services) = the kitchen — does the real work, unseen
• Database (Mongo/Postgres) = pantry and storeroom — organised ingredients
• Cache (Redis) = pre-cut vegetables on the counter — fast, but must be refreshed
• Load balancer = host at the door sending guests to free tables
• Docker = a food truck — kitchen plus everything it needs, cooks the same anywhere
• CI/CD = quality line — every dish checked before it leaves

The API is the centre of every request: check cache → fall back to DB → hand slow work to a queue.`,
    },
    {
      title: "How to answer: definition → analogy → experience", topic: "Interview", tags: "framework,answers", pinned: true, interview: true,
      content: `1. Technical definition first.
2. Add the analogy if they look unsure.
3. One line from your own project: "In QuickBite I used this when…"

This is the strongest answer shape. Practise it on every interview question.`,
    },
    {
      title: "JavaScript concepts through analogies", topic: "JavaScript", skill: "JavaScript", tags: "analogy,js", interview: true,
      content: `Closure — a backpack: a function carries variables from where it was born → retains access to its lexical scope after the outer function returns
Event loop — one chef with a ticket rail → single thread, async work offloaded, callbacks run when the stack is empty
Microtask vs macrotask — VIP orders (promises) before regular orders (setTimeout) → microtasks drain before the next macrotask
Promise — a Swiggy order ID → eventual completion or failure of async work
Debounce — lift door waits until people stop entering → fire after input stops for N ms (search)
Throttle — metro gate, one person per second → at most once per N ms (scroll, resize)
Hoisting — attendance read before class, marks later → declarations processed first; let/const in TDZ
Prototype — family traits: ask parent, then grandparent → lookup walks the prototype chain`,
    },
    {
      title: "React concepts through analogies", topic: "React", skill: "React", tags: "analogy,react", interview: true,
      content: `Virtual DOM + reconciliation — edit a draft, change only edited lines in the printed copy → diff + minimal DOM patch
Keys — roll numbers: rearrange seats and the teacher still knows who's who → stable identity across renders
State vs props — your wallet vs pocket money from parents → owned/mutable vs read-only input
useEffect — "after dinner, wash the dishes" → sync with external systems after render
useMemo / useCallback — sticky note with a long sum's answer → memoize values / stable function refs
Context — building intercom announcement → avoid prop drilling for app-wide data
Redux / Zustand — bank ledger, changes only via approved transactions → single source of truth
Lazy loading — Netflix streams episode 1 first → load code/data only when needed`,
    },
    {
      title: "Backend & database concepts through analogies", topic: "Backend", skill: "Node.js & Express", tags: "analogy,backend,db", interview: true,
      content: `Middleware — airport checkpoints: ID → bag scan → boarding; any can stop you
REST status codes — courier updates: 200 delivered, 201 booked, 400 wrong address, 401 no ID, 403 not allowed, 404 house not found, 500 van broke down
Idempotency — pressing the lift button 5 times still calls it once (critical for payments)
Index — the index page at the back of a textbook (faster reads, slower writes, more storage)
Embed vs reference — Aadhaar in your wallet vs property papers in a bank locker
Transaction / ACID — UPI transfer: money leaves A and reaches B, or nothing happens
JWT — movie ticket with a stamp; usher checks the stamp, doesn't call the box office
Session — coat check: you hold a token number, the counter keeps your coat
Refresh token — office ID card used to get a daily visitor pass
bcrypt — making juice: easy one way, impossible to turn back into fruit
CORS — apartment security only lets in delivery partners from approved apps
Rate limiting — ATM: max 5 withdrawals a day`,
    },
    {
      title: "System design concepts through analogies", topic: "System Design", skill: "System Design", tags: "analogy,system-design", interview: true,
      content: `Vertical vs horizontal scaling — one super-chef vs more counters with normal chefs
Load balancer — toll plaza manager pointing cars to the shortest lane
Caching — water bottles in your bag instead of walking to the kitchen (TTL + invalidation)
CDN — Amazon warehouses in every city
Replication — photocopies of an important file in several offices
Sharding — library splits books A–M in one hall, N–Z in another (shard key)
CAP — two bank branches lose their phone line: stop serving (consistent) or serve stale balances (available)
Message queue — restaurant token system; kitchen processes at its own speed
Microservices — food court stalls vs one big restaurant (monolith)
Pub/Sub — WhatsApp group: one message, every subscriber receives it
Circuit breaker — home MCB trips on a fault, protecting the rest of the house`,
    },
    {
      title: "DevOps & Docker concepts through analogies", topic: "DevOps", skill: "Docker", tags: "analogy,docker,devops", interview: true,
      content: `Image vs container — recipe vs the dish cooked from it
Dockerfile — the written recipe card (layer by layer)
Multi-stage build — cook in a big kitchen, pack only the final dish in the tiffin
Volume — a locker outside the food truck; survives when the truck is replaced
docker-compose — wedding planner coordinating caterer, decorator, DJ
CI/CD — car factory assembly line with checks at every station
Environment variables — same TV, different remote settings per room
Reverse proxy (Nginx) — office receptionist routing visitors
Blue-green deploy — keep the old bridge open while testing the new one, then switch`,
    },
    {
      title: "System design answer framework", topic: "System Design", skill: "System Design", tags: "framework", pinned: true, interview: true,
      content: `Use every time:
1. Clarify requirements (functional + non-functional)
2. Estimate scale (users, QPS, storage)
3. Define APIs
4. Data model
5. High-level diagram
6. Deep dive on one bottleneck
7. Trade-offs and what you'd improve`,
    },
    {
      title: "DSA: why it feels hard + the 25-minute rule", topic: "DSA", skill: "DSA", tags: "dsa,method", pinned: true,
      content: `Goal: most easy + common medium problems — ~140 in 12 weeks, in JavaScript. Recognise ~12 patterns.

Why it feels hard → fix
• Random problems → never see the pattern. Solve by pattern, in order.
• Looking at the answer after 5 min → nothing sticks. 25-minute rule: try 25 min → read the solution → close it, write it yourself → re-solve 3 days later (the tracker schedules this when you "Mark solved").
• Memorising code → fails on a twist. Write the idea in one English sentence before coding ("two pointers from both ends, move the smaller one").

In the interview: brute force first + its complexity → improve. Talk while you code. A clean, explained medium beats a silent, half-done optimal.

Resources: pick ONE list and finish it — NeetCode 150 or Striver's A2Z.`,
    },
    {
      title: "DSA pattern order with real-life pictures", topic: "DSA", skill: "DSA", tags: "dsa,patterns",
      content: `W1   Big-O + arrays & strings — counting steps to find a friend in a crowd (12 easy)
W1–2 Hashing — phone contact list (12)
W2–3 Two pointers — two people searching a sorted bookshelf from both ends (10)
W3–4 Sliding window — train window view sliding one pole at a time (10)
W4–5 Stack & queue — plates / ticket counter queue (10)
W5–6 Binary search — guess 1–100 with higher/lower (10)
W6   Linked list — treasure hunt, each clue points to the next (10)
W7–8 Recursion + trees — family tree; BFS = generation by generation (15)
W9   Heap — hospital ER, most serious patient first (8)
W9–10 Graphs — city map: places and roads (10)
W10–11 Backtracking — trying keys in a lock, undoing wrong ones (8)
W11–12 Intro DP — writing results of past exams so you never redo a question (12)

Also practise JS questions (DSA → topic "JS Polyfills"): map/reduce/bind/Promise.all polyfills, flatten, deep clone, event emitter, LRU cache, memoize, curry.`,
    },
    {
      title: "QuickBite — the portfolio project plan", topic: "Projects", tags: "quickbite,portfolio", pinned: true,
      content: `MERN + TypeScript food-ordering app with live order tracking. Fits the restaurant analogy.

W1–3  React + TS frontend: menu, cart, debounced search, lazy pages → React depth, performance
W4    Express REST API: restaurants, menu, orders, validation, error middleware
W5    Mongo models with indexes; order history via aggregation
W6    Signup/login with access + refresh tokens in httpOnly cookies, roles; Jest tests
W7    Multi-stage Dockerfile + docker-compose (web, API, Mongo, Redis)
W8    GitHub Actions; deploy frontend (S3/CloudFront or Vercel), API (EC2/Render) behind Nginx + HTTPS
W9    Redis menu cache, BullMQ order emails, Socket.IO live status, S3 pre-signed uploads
W10–11 README with architecture diagram, scaling plan, trade-offs

Make it count: live + GitHub link at the top of your resume · README with screenshots and one-command run · MEASURE something (load time before/after lazy loading, API time before/after Redis).

Optional: machine-coding repo — autocomplete, modal, infinite scroll, star rating, file explorer, kanban, pagination, OTP input, carousel, nested comments (60–90 min each).`,
    },
    {
      title: "Career narrative — tell me about yourself (60 s)", topic: "Interview", skill: "Behavioral & Negotiation", tags: "behavioral,pitch", interview: true, pinned: true,
      content: `"I'm a full stack developer with 3 years of experience. I started on mobile with Flutter, where I built and shipped [app type] used by [users]. That taught me state management, API integration and release discipline. For the last [1.5] years I've been on React, building [feature/product]. Alongside work I've gone deep on the backend — Node, Express, MongoDB, Docker and AWS — and built QuickBite, a full MERN app with real-time order tracking and CI/CD. I'm now looking for a full stack role where I can own features end to end."

Fill the brackets with REAL details. Flutter → React is a strength: "I learn new stacks fast and understand both mobile and web users." Never apologise for it.`,
    },
    {
      title: "8 STAR stories (fill with real details)", topic: "Interview", skill: "Behavioral & Negotiation", tags: "behavioral,star", interview: true,
      content: `Each: Situation, Task, Action, Result — 90 seconds spoken. Never invent.

1. Learning a new stack fast — S: team moved to React. T: deliver [feature] in [time]. A: mapped Flutter widgets → components, small prototypes. R: shipped on time, [metric]
2. Performance fix — S: [screen] was slow. A: profiled with React DevTools, fixed re-renders/bundle with memo, lazy loading, pagination. R: load time [X → Y]
3. Production bug under pressure — reproduced, hotfixed, added a test + monitoring. R: fixed in [time], never recurred
4. Disagreement with a teammate/lead — listened, compared trade-offs with data, ran a small spike. R: agreed path, relationship stayed good
5. Ownership beyond your role — noticed [manual process / no tests / no CI], built [script/pipeline/library]. R: saved [hours]/week
6. Unclear requirements — asked questions, made a mockup, confirmed scope in writing. R: avoided rework
7. A mistake you made — real but recoverable; spend most time on what you changed afterwards
8. QuickBite design decision — why Redis for menus, queue for emails, httpOnly cookies, what you'd change at 100x scale

Rules: say "I", not "we" · end with a number · write it here, then say it out loud 3 times and record once.`,
    },
    {
      title: "Resume checklist (update in week 6)", topic: "Job Search", tags: "resume",
      content: `• 1 page. Title: "Full Stack Developer (MERN) — 3 years" (not "Flutter Developer")
• Skills: React, TypeScript, Node.js, Express, MongoDB, PostgreSQL, Redis, Docker, AWS, GitHub Actions, Flutter
• Every bullet = action verb + what + measurable result
  ✗ "Worked on performance"
  ✓ "Reduced dashboard load time from 4.2s to 1.6s by code-splitting and memoizing heavy charts"
• QuickBite with live + GitHub links
• ATS-friendly: plain layout, no tables or photos, PDF`,
    },
    {
      title: "Where to apply + weekly targets + sequencing", topic: "Job Search", tags: "applications,channels",
      content: `Your biggest salary lever is having 2–3 offers at once.

Weekly targets (track in Applications):
• Referrals (LinkedIn, ex-colleagues, seniors) — 5 requests (highest response rate)
• LinkedIn + Naukri (profile "open", update every few days) — 15
• Instahyre, Wellfound, Cutshort (startups, better pay) — 10
• Company career pages (top 10 targets) — 3

Sequencing
1. Weeks 6–8: service companies + smaller startups — interviews as paid practice
2. Weeks 8–11: target startups and product companies
3. Weeks 11–13: get final rounds to overlap so offers arrive together

Long notice period (60–90 days)? Ask about buyout/early release — many startups prefer joining within 30 days.`,
    },
    {
      title: "Salary negotiation scripts", topic: "Job Search", skill: "Behavioral & Negotiation", tags: "negotiation,salary", interview: true,
      content: `• Expected CTC: give a market number, not a % hike. From 3.36 LPA a "50% hike" is still far below market.
  "Based on my skills and the market for 3-year full stack roles, I'm looking for 12–14 LPA."
• Get their number first: "I'd like to understand the budget for this role first."
• Use a real competing offer politely: "I have an offer at X; I prefer your company — can you get closer to Y?"
• Compare FIXED pay. Variable, joining bonus and ESOPs are worth less than they look.
• Expect a counter-offer from your current employer. Decide in advance — it rarely fixes why you wanted to leave.
• Current CTC: be honest if asked directly, then move to expected CTC.`,
    },
    {
      title: "Daily recall template", topic: "Daily Recall", tags: "recall,template",
      content: `Use Notes → "Daily recall" every night (10:45–11:00 PM). Five lines:
1. What I learned today:
2. In my own words:
3. Real-life analogy:
4. What I built / committed:
5. Tomorrow's first task:

Sunday: skim this week's recall notes and explain each one out loud.`,
    },
  ];
  for (const n of notes) {
    await prisma.note.create({
      data: {
        title: n.title, topic: n.topic, tags: n.tags, pinned: n.pinned ?? false, isInterview: n.interview ?? false,
        content: n.content, skillId: n.skill ? skills[n.skill] : null,
      },
    });
  }

  console.log(
    `✅ Your plan is loaded (starts ${START.toDateString()}): ${taskCount} tasks, ${skillDefs.length} skills, ` +
      `${problems.length + jsQs.length} DSA problems to do, ${Q.length} interview questions, ${notes.length} recap notes. Go! 🚀`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
