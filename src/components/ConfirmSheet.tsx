"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import Sheet from "@/components/Sheet";
import { haptic } from "@/lib/haptics";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm>(async () => false);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((opts) => {
    resolveRef.current?.(false);
    setOptions(opts);
    setOpen(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function settle(ok: boolean) {
    if (ok) haptic(10);
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setOpen(false);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={open}
        onClose={() => settle(false)}
        labelledBy="confirm-title"
      >
        {options && (
          <div className="pt-1 text-center">
            <h2
              id="confirm-title"
              className="text-base font-extrabold text-text-primary"
            >
              {options.title}
            </h2>
            {options.message && (
              <p className="mt-1.5 text-sm text-text-secondary">
                {options.message}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => settle(true)}
                className={`h-12 rounded-xl text-sm font-bold transition-transform duration-150 active:scale-[0.97] ${
                  options.destructive
                    ? "bg-red/15 text-red"
                    : "bg-gradient-to-r from-blue to-blue-dark text-white"
                }`}
              >
                {options.confirmLabel}
              </button>
              <button
                onClick={() => settle(false)}
                className="h-12 rounded-xl bg-white/5 text-sm font-semibold text-text-primary transition-transform duration-150 active:scale-[0.97]"
              >
                {options.cancelLabel ?? "Cancel"}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </ConfirmContext.Provider>
  );
}
