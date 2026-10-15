export function PageHeader({
  title,
  subtitle,
  emoji,
  actions,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {emoji && <span className="mr-2">{emoji}</span>}
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft dark:text-zinc-400 sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
