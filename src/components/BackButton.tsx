"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      aria-label="Back"
      className="-mx-2.5 flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition-[transform,background-color] duration-150 ease-out active:scale-90 active:bg-white/5"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
