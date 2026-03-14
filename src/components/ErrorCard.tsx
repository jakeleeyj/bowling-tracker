"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorCard({
  message = "Something went wrong",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="glass p-8 text-center">
      <AlertTriangle size={24} className="mx-auto mb-2 text-gold" />
      <p className="mb-3 text-sm text-text-secondary">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-surface-light px-4 py-2 text-xs font-semibold text-text-primary active:scale-95"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
