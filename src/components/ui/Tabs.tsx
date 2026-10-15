"use client";
import { cn } from "@/lib/client";

/** iOS-style segmented control. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex max-w-full overflow-x-auto rounded-xl bg-black/5 p-1 dark:bg-white/10", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm",
            value === o.value
              ? "bg-white text-ink shadow-sm dark:bg-zinc-700 dark:text-white"
              : "text-ink-soft hover:text-ink dark:text-zinc-400 dark:hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
