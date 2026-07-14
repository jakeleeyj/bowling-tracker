import { Heart } from "lucide-react";

export const metadata = {
  title: "Support — Spare Me",
};

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="glass p-6 text-center">
        <div className="mb-3 flex justify-center">
          <Heart size={32} className="text-red" />
        </div>
        <h1 className="mb-2 text-2xl font-extrabold">Support Spare Me</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Spare Me is free and has no ads. If it&apos;s helped your game, a
          small tip helps cover hosting costs and keeps it running.
        </p>
        <a
          href="https://ko-fi.com/jakelyj45285"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-gradient-to-r from-blue to-blue-dark px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.97]"
        >
          Buy me a frame on Ko-fi
        </a>
        <p className="mt-4 text-xs text-text-muted">
          Every bit goes toward server costs. Thank you!
        </p>
      </div>
    </main>
  );
}
