"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Check, X, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[100] mx-auto flex max-w-[400px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-slide-up flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
              t.type === "success"
                ? "bg-green/90 text-white"
                : t.type === "error"
                  ? "bg-red/90 text-white"
                  : "bg-surface-light text-text-primary"
            }`}
          >
            {t.type === "success" && <Check size={16} strokeWidth={3} />}
            {t.type === "error" && <X size={16} strokeWidth={3} />}
            {t.type === "info" && <Info size={16} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
