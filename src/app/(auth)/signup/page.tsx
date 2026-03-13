"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

function Logo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 240"
      className="h-24 w-auto"
    >
      <defs>
        <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="ss" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform="translate(30, 10)">
        <circle cx="40" cy="30" r="26" fill="url(#sp)" />
        <ellipse cx="40" cy="65" rx="16" ry="10" fill="url(#sp)" />
        <ellipse cx="40" cy="128" rx="36" ry="52" fill="url(#sp)" />
        <rect x="24" y="55" width="32" height="22" fill="url(#sp)" />
        <rect x="12" y="72" width="56" height="32" fill="url(#sp)" />
        <rect x="22" y="60" width="36" height="5" rx="2.5" fill="#ef4444" />
        <rect x="22" y="68" width="36" height="5" rx="2.5" fill="#ef4444" />
      </g>
      <rect
        x="115"
        y="20"
        width="24"
        height="180"
        rx="12"
        fill="url(#ss)"
        transform="rotate(15, 127, 110)"
        filter="url(#glow2)"
        opacity="0.9"
      />
      <circle cx="138" cy="218" r="12" fill="#f59e0b" filter="url(#glow2)" />
    </svg>
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user && !data.session) {
      setConfirmEmail(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (confirmEmail) {
    return (
      <div className="glow-blue glow-purple flex min-h-dvh items-center justify-center overflow-hidden px-4">
        <div className="glass-strong relative z-10 w-full max-w-sm p-8 text-center">
          <div className="mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto text-blue"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-extrabold">Check your email</h1>
          <p className="mb-4 text-sm text-text-muted">
            We sent a confirmation link to{" "}
            <span className="font-medium text-text-primary">{email}</span>.
            Click it to activate your account.
          </p>
          <p className="text-xs text-text-muted">
            Didn&apos;t get it? Check your spam folder.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-blue"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="glow-blue glow-purple flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      {/* Brand */}
      <div className="relative z-10 mb-6 flex flex-col items-center">
        <Logo />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
          Join Spare Me<span className="text-gold">?</span>
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Start tracking your bowling scores
        </p>
      </div>

      {/* Form card */}
      <div className="glass-strong relative z-10 w-full max-w-sm p-6">
        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="rounded-lg border border-border bg-surface-light px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-border bg-surface-light px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded-lg border border-border bg-surface-light px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
          />

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold shadow-lg shadow-blue/25 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
