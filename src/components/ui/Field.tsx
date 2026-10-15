"use client";
import { cn } from "@/lib/client";

interface BaseProps {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
}

function Wrapper({ label, error, hint, className, children, htmlFor }: BaseProps & { children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-soft dark:text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ label, error, hint, className, id, ...props }: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const fid = id ?? props.name;
  return (
    <Wrapper label={label} error={error} hint={hint} className={className} htmlFor={fid}>
      <input id={fid} className={cn("input", error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15")} {...props} />
    </Wrapper>
  );
}

export function Textarea({ label, error, hint, className, id, ...props }: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fid = id ?? props.name;
  return (
    <Wrapper label={label} error={error} hint={hint} className={className} htmlFor={fid}>
      <textarea id={fid} className={cn("input min-h-[90px] resize-y", error && "border-rose-400")} {...props} />
    </Wrapper>
  );
}

export function Select({
  label,
  error,
  hint,
  className,
  options,
  id,
  ...props
}: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string | number; label: string }[] }) {
  const fid = id ?? props.name;
  return (
    <Wrapper label={label} error={error} hint={hint} className={className} htmlFor={fid}>
      <select id={fid} className={cn("input appearance-none pr-8", error && "border-rose-400")} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-sm"
    >
      <span className={cn("relative h-6 w-10 rounded-full transition", checked ? "bg-brand-500" : "bg-zinc-300 dark:bg-zinc-700")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}
