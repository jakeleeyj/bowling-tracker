"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

function Logo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 180"
      className="h-28 w-auto"
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="90" cy="36" r="10" fill="#e2e8f0" />
      <circle cx="66" cy="68" r="10" fill="#e2e8f0" />
      <circle cx="114" cy="68" r="10" fill="#e2e8f0" />
      <circle cx="42" cy="100" r="10" fill="url(#lg)" />
      <circle cx="90" cy="100" r="10" fill="#e2e8f0" />
      <circle cx="138" cy="100" r="10" fill="#e2e8f0" />
      <circle cx="90" cy="148" r="8" fill="#f59e0b" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="glow-blue glow-purple flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      {/* Brand */}
      <div className="relative z-10 mb-8 flex flex-col items-center">
        <Logo />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
          Spare Me<span className="text-gold">?</span>
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Track scores. Chase spares. Talk trash.
        </p>
      </div>

      {/* Form card */}
      <div className="glass-strong relative z-10 w-full max-w-sm p-6">
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
          />

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold shadow-lg shadow-blue/25 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-text-muted">
          No account?{" "}
          <Link href="/signup" className="font-medium text-blue">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
