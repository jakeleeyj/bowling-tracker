"use client";

import ErrorCard from "@/components/ErrorCard";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div className="pt-10">
      <ErrorCard message="Failed to load this page" onRetry={reset} />
    </div>
  );
}
