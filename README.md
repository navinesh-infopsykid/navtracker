# 🚀 NavTracker

A personal, **fully local** study & career-prep tracker for a 12-week plan.
Next.js 14 · React 18 · TypeScript · Tailwind CSS · Next.js API routes (Node) · Prisma · SQLite.

No accounts, no cloud, no paid services. Your data lives in one file: `prisma/dev.db`.

---

## ⚡️ Quick start (macOS)

You need **Node.js 18.18+** (20 LTS recommended). Check with `node -v`.
If you don't have it: `brew install node@20` (or download from nodejs.org).

```bash
# 1. Unzip and enter the project
cd ~/Downloads
unzip navtracker.zip
cd navtracker

# 2. Install dependencies (also generates the Prisma client)
npm install

# 3. Create the local SQLite database from the migration
npx prisma migrate deploy

# 4. Load YOUR 12-week MERN plan (goals, tasks, skills, DSA list, interview Qs, recap notes)
npx prisma db seed

# 5. Run it
npm run dev
```

Open **http://localhost:3000** 🎉

> Steps 3 + 4 together: `npm run setup`
>
> The plan starts on the day you seed. To pick a date: `PLAN_START=2026-10-19 npx prisma db seed`
> ⚠️ Seeding **wipes** the database — do it once at the start, never after you've logged progress.

### Use it on your iPhone / Android (same Wi‑Fi as your Mac)
```bash
npm run dev:phone          # or: npm run build && npm run start:phone
ipconfig getifaddr en0     # prints your Mac's local IP, e.g. 192.168.1.23
```
On your phone open **http://192.168.1.23:3000** (your IP), then Share → **Add to Home Screen** — it opens full-screen like an app.
Your data still lives only on your Mac; the Mac must be awake and `npm run dev:phone` running. macOS may ask to allow incoming connections for Node — click Allow.

### Already installed an earlier version?
```bash
cd navtracker            # your existing folder, after copying the updated files in
npm install
npx prisma migrate deploy   # adds per-day targets + job applications (keeps existing data)
npx prisma db seed          # replaces everything with your real plan
npm run dev
```

### Daily use
```bash
cd ~/Downloads/navtracker   # wherever you keep it
npm run dev
```
For a faster, production-style server: `npm run build && npm start`.

### Start over
```bash
npm run db:reset     # wipes the DB and loads the 12-week plan again
npm run db:empty     # wipes the DB with nothing in it at all
```

### Back up your data
Copy `prisma/dev.db` somewhere safe, or use **Settings → Export backup (JSON)**.

---

## 📋 What the seed loads (from your MERN job-switch plan)

- **Goals:** career switch (10–18 LPA) → 4 phases → 12 weekly goals; life goals: help people in need, become healthy, Apple Watch for health, latest iPhone, personal MacBook, Ford Mustang; daily non-negotiables
- **227 tasks** following the plan's daily rhythm: Mon–Thu = DSA (1 h) + concept (75 min) + QuickBite build (1 h); Friday = morning DSA then rest; Saturday DSA + big build push; Sunday revision (+ mock interviews from week 4); resume + applications from week 6; a weekly health habit; helping someone every 4 weeks
- **Targets:** Mon–Thu 3.5 h, Fri 1 h (rest evening), Sat–Sun 6.5 h ≈ 28 h/week
- **15 skills** with prep checklists, **46 DSA problems** to do, **51 interview questions** with model answers (confidence starts at 1), **22 recap notes** (analogies, routine, roadmap, DSA method, QuickBite, STAR stories, resume, applications, negotiation, system design framework)
- No fake progress: zero sessions, zero solved problems, zero XP.

## ✨ Features

| Area | What you get |
|---|---|
| **This Week** | Your plan week day by day with the **weekly target** (hours studied vs. target, adjustable with presets), tasks done, and *time left vs. work left*. Tap a task's time to adjust it (±15 min), move it to another day or push it to next week, complete it with **the time it actually took** (optionally added to your study hours), unfinished tasks carried over, and **Pull in** tasks from next week when you finish early |
| **Dashboard** | Apple-Fitness-style activity rings (Study / Tasks / DSA), daily / weekly / monthly charts vs. target, streak, XP & level, 12-week plan ring with on-pace score, consistency heatmap, goal completion %, skill levels, upcoming tasks, rewards, badges |
| **Recovery plan** | When you miss days or tasks go overdue: a firm-but-kind plan — extra minutes/day (capped at +60 to avoid burnout), top overdue tasks first, and a one-click **Reschedule overdue** that spreads them across your next working days |
| **Goals & Tasks** | Yearly / monthly / weekly / daily goals with parent goals, tasks with deadline, priority, estimate; filters for Today / Upcoming / Overdue / Completed |
| **Study Sessions** | Focus timer (survives tab close, 25-min Pomodoro ring), quick log, daily target + daily **limit** warnings, history grouped by day |
| **DSA Tracker** | The plan's problem list pre-loaded as **to do** (by pattern & week) + JS polyfill questions; **Mark solved** schedules a re-solve 3 days later; topic, difficulty, link, approach, complexity, code with one-click copy, starred interview set, spaced revision (1→3→7→14→30→60 days) |
| **Skills & Interview** | React, JS, TS, Next.js, Node, NestJS/Express, SQL, DSA, System Design, Behavioral (+ custom skills), level slider, prep checklists, notes, interview Q&A with confidence ratings and a **Practice mode** weighted toward weak questions |
| **Notes** | Searchable (with highlights), filter by topic / skill / interview-prep, pinning, tags, **Daily recall** template (5 lines every night), export everything as **interview-notes.md** |
| **Rewards** | XP from real work → Apple Watch (1,500 XP), latest iPhone (3,500), MacBook (5,500 — end of plan), Ford Mustang (25,000 — the long game). All editable; 22 achievement badges; confetti when you win |
| **Applications** | Job pipeline (wishlist → applied → interviewing → offer), company type, channel, expected/offered LPA, next step dates, this week vs. plan targets (5 referrals · 15 LinkedIn/Naukri · 10 Instahyre/Wellfound/Cutshort · 3 career pages), negotiation helper |
| **Settings** | Name, main goal, **minutes per weekday** (0 = rest day), daily limit, streak minimum, DSA/day, plan start & length, light/dark/system theme, 5 accent colors, dream rewards, export |

### XP rules
1 XP / 10 min studied · 10 XP / task · 50 XP / goal · 10 / 20 / 35 XP per easy / medium / hard problem · 5 XP / checklist item.

### Streak rules
A day counts when you study at least the *streak minimum* (default 30 min). Non-working days never break the streak, and an unfinished "today" doesn't break it either.

---

## 🗂 Project structure

```
navtracker/
├─ prisma/
│  ├─ schema.prisma          # database models
│  ├─ migrations/            # SQL migration (creates the tables)
│  └─ seed.ts                # sample data (relative to today)
├─ src/
│  ├─ app/
│  │  ├─ page.tsx            # Dashboard
│  │  ├─ goals/ sessions/ dsa/ skills/ notes/ rewards/ settings/   # pages
│  │  └─ api/                # REST API (route handlers, run on Node)
│  ├─ components/
│  │  ├─ ui/                 # Button, Card, Modal, Field, ProgressRing, Tabs, Toast…
│  │  ├─ dashboard/          # charts, heatmap, recovery card, badges, rewards
│  │  └─ layout/             # sidebar shell + settings/theme provider
│  └─ lib/
│     ├─ validation.ts       # zod schemas (all API input is validated)
│     ├─ stats.ts            # dashboard, streaks, XP, achievements, recovery plan
│     ├─ api.ts              # route helpers + consistent JSON errors
│     ├─ client.ts           # fetch helper + useFetch hook
│     └─ constants.ts, dates.ts, types.ts
```

**How data flows:** page (client component) → `useFetch("/api/…")` → route handler validates with zod → Prisma → SQLite. Errors come back as `{ error, fields }` and are shown next to the form field.

### API overview
| Endpoint | Methods |
|---|---|
| `/api/dashboard` | GET |
| `/api/week` | GET (`?offset=-1/1` for previous/next plan week) |
| `/api/settings` | GET, PUT |
| `/api/goals`, `/api/goals/:id` | GET, POST · PUT, PATCH (status), DELETE |
| `/api/tasks`, `/api/tasks/:id` | GET (`?filter=today\|upcoming\|overdue\|open\|completed`), POST · PUT, PATCH (`completed`, `deadline`, `estimatedMinutes`, `actualMinutes`, `logSession`), DELETE |
| `/api/tasks/reschedule` | POST |
| `/api/sessions`, `/api/sessions/:id` | GET, POST · PUT, DELETE |
| `/api/dsa`, `/api/dsa/:id` | GET (`?q,difficulty,topic,status,due,starred`), POST · GET, PUT, PATCH (revise/star), DELETE |
| `/api/skills`, `/api/skills/:id` | GET, POST · PUT, PATCH, DELETE |
| `/api/checklist`, `/api/checklist/:id` | POST · PATCH, DELETE |
| `/api/questions`, `/api/questions/:id` | GET, POST · PUT, PATCH, DELETE |
| `/api/notes`, `/api/notes/:id` | GET, POST · PUT, PATCH, DELETE |
| `/api/rewards`, `/api/rewards/:id` | GET, POST · PUT, PATCH (claim), DELETE |
| `/api/applications`, `/api/applications/:id` | GET, POST · PUT, PATCH (status), DELETE |
| `/api/notes/export` | GET (`interview-notes.md`, `?interview=1` for interview notes only) |
| `/api/export` | GET (JSON backup) |

### Changing the database
1. Edit `prisma/schema.prisma`
2. `npx prisma migrate dev --name describe_change`
3. Browse data visually anytime: `npm run db:studio`

---

## 🛠 Troubleshooting

- **`command not found: npm`** → install Node: `brew install node@20`, then `echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc`
- **Port 3000 in use** → `npm run dev -- -p 3001`
- **"Can't reach the NavTracker server"** in the UI → the `npm run dev` terminal was closed; start it again.
- **Prisma errors after editing the schema** → `npx prisma generate`, then restart `npm run dev`.
- **Weird data / want a redo** → `npm run db:reset`.
