"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Brain,
  Briefcase,
  CalendarCheck,
  LayoutGrid,
  Code2,
  LayoutDashboard,
  Menu,
  Moon,
  NotebookPen,
  Settings,
  Sun,
  Target,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/client";
import { useSettings } from "./SettingsProvider";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/week", label: "This Week", icon: CalendarCheck },
  { href: "/goals", label: "Goals & Tasks", icon: Target },
  { href: "/sessions", label: "Study Sessions", icon: Timer },
  { href: "/dsa", label: "DSA Tracker", icon: Code2 },
  { href: "/skills", label: "Skills & Interview", icon: Brain },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/rewards", label: "Rewards", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
];

const TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/week", label: "Week", icon: CalendarCheck },
  { href: "/sessions", label: "Study", icon: Timer },
  { href: "/dsa", label: "DSA", icon: Code2 },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-lg font-black text-white shadow-glow">N</div>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-tight">NavTracker</div>
        <div className="text-[11px] text-ink-soft dark:text-zinc-500">Career prep, daily</div>
      </div>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
                : "text-ink-soft hover:bg-black/[0.04] hover:text-ink dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] transition group-hover:scale-110", active && "text-brand-600 dark:text-brand-300")} />
            {label}
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setThemeQuick } = useSettings();
  const dark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setThemeQuick(dark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition hover:bg-black/5 hover:text-ink dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="mesh-bg min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-black/5 bg-white/60 px-4 py-6 backdrop-blur-2xl dark:border-white/5 dark:bg-zinc-950/60 lg:flex">
        <div className="mb-8 flex items-center justify-between px-2">
          <Logo />
          <ThemeToggle />
        </div>
        <NavLinks />
        <div className="mt-auto rounded-2xl bg-brand-gradient p-4 text-white shadow-glow">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Main goal</div>
          <div className="mt-1 text-sm font-semibold leading-snug">{settings?.mainGoal ?? "Loading…"}</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white/70 px-4 py-3 backdrop-blur-2xl dark:border-white/5 dark:bg-zinc-950/70 lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white p-5 shadow-2xl animate-[fade-up_0.25s_ease-out] dark:bg-zinc-950">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="px-4 pb-28 pt-5 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/85 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/85 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition",
                  active ? "text-brand-600 dark:text-brand-300" : "text-ink-soft dark:text-zinc-500",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                {label}
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-ink-soft dark:text-zinc-500">
            <LayoutGrid className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
