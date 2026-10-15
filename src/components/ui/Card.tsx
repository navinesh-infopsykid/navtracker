import { cn } from "@/lib/client";

export function Card({
  className,
  children,
  hover,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className={cn("card animate-fade-up p-5", hover && "card-hover", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ icon, title, action, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">{icon}</div>}
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-ink-soft dark:text-zinc-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
