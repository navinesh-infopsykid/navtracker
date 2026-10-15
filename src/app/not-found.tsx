import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-20 max-w-md p-10 text-center">
      <div className="text-5xl">🧭</div>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-ink-soft dark:text-zinc-400">This page took a rest day. Let&apos;s get you back on track.</p>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white">
        Go to dashboard
      </Link>
    </div>
  );
}
