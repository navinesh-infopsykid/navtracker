-- CreateTable
CREATE TABLE "JobApplication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Full Stack Developer (MERN)',
    "companyType" TEXT NOT NULL DEFAULT 'STARTUP',
    "channel" TEXT NOT NULL DEFAULT 'LinkedIn',
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "link" TEXT,
    "contact" TEXT,
    "expectedLpa" REAL,
    "offeredLpa" REAL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextStep" TEXT,
    "nextStepDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'Navinesh',
    "dailyTargetMinutes" INTEGER NOT NULL DEFAULT 240,
    "dailyLimitMinutes" INTEGER NOT NULL DEFAULT 480,
    "streakMinMinutes" INTEGER NOT NULL DEFAULT 30,
    "dailyDsaTarget" INTEGER NOT NULL DEFAULT 2,
    "workingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
    "dayTargets" TEXT NOT NULL DEFAULT '',
    "planStartDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planWeeks" INTEGER NOT NULL DEFAULT 12,
    "mainGoal" TEXT NOT NULL DEFAULT 'Land a full-stack developer role',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "accent" TEXT NOT NULL DEFAULT 'violet',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("accent", "dailyDsaTarget", "dailyLimitMinutes", "dailyTargetMinutes", "id", "mainGoal", "name", "planStartDate", "planWeeks", "streakMinMinutes", "theme", "updatedAt", "workingDays") SELECT "accent", "dailyDsaTarget", "dailyLimitMinutes", "dailyTargetMinutes", "id", "mainGoal", "name", "planStartDate", "planWeeks", "streakMinMinutes", "theme", "updatedAt", "workingDays" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
