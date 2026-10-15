"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { cn } from "@/lib/client";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface Ctx {
  toast: (message: string, kind?: ToastKind) => void;
  celebrate: (message?: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const CONFETTI_COLORS = ["#ff375f", "#30d158", "#0a84ff", "#ffd60a", "#bf5af2", "#ff9f0a"];

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confetti, setConfetti] = useState(0);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const celebrate = useCallback(
    (message?: string) => {
      setConfetti((c) => c + 1);
      if (message) toast(message, "success");
    },
    [toast],
  );

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    [],
  );

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const icon = { success: CheckCircle2, error: XCircle, info: Info };

  return (
    <ToastContext.Provider value={{ toast, celebrate, confirm }}>
      {children}

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {toasts.map((t) => {
          const Icon = icon[t.kind];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl bg-zinc-900/95 px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur animate-fade-up dark:bg-white/95 dark:text-zinc-900"
            >
              <Icon className={cn("h-5 w-5 shrink-0", t.kind === "success" ? "text-emerald-400 dark:text-emerald-600" : t.kind === "error" ? "text-rose-400" : "text-sky-400")} />
              {t.message}
            </div>
          );
        })}
      </div>

      {/* Confetti burst */}
      {confetti > 0 && (
        <div key={confetti} className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
          {Array.from({ length: 60 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 0.3;
            const dur = 1.6 + Math.random() * 1.2;
            const rot = Math.random() * 720 - 360;
            return (
              <span
                key={i}
                className="absolute top-[-20px] block h-3 w-2 rounded-sm"
                style={{
                  left: `${left}%`,
                  background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                  animation: `confetti-fall ${dur}s ${delay}s cubic-bezier(0.2,0.6,0.4,1) forwards`,
                  ["--rot" as string]: `${rot}deg`,
                }}
              />
            );
          })}
          <style>{`@keyframes confetti-fall { to { transform: translateY(105vh) rotate(var(--rot)); opacity: 0.2; } }`}</style>
        </div>
      )}

      <Modal
        open={!!confirmState}
        onClose={() => closeConfirm(false)}
        title={confirmState?.title ?? ""}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => closeConfirm(false)}>
              Cancel
            </Button>
            <Button variant={confirmState?.danger ? "danger" : "primary"} onClick={() => closeConfirm(true)}>
              {confirmState?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft dark:text-zinc-400">{confirmState?.message}</p>
      </Modal>
    </ToastContext.Provider>
  );
}
