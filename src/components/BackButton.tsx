"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="text-text-muted active:scale-90"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
