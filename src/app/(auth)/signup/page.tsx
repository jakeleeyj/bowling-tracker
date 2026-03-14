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
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="90" cy="36" r="10" fill="#e2e8f0" />
      <circle cx="66" cy="68" r="10" fill="#e2e8f0" />
      <circle cx="114" cy="68" r="10" fill="#e2e8f0" />
      <circle cx="42" cy="100" r="10" fill="url(#sg)" />
      <circle cx="90" cy="100" r="10" fill="#e2e8f0" />
      <circle cx="138" cy="100" r="10" fill="#e2e8f0" />
      <circle cx="90" cy="148" r="8" fill="#f59e0b" />
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
      <div className="relative z-10 mb-8 flex flex-col items-center">
        <Logo />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
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
            className="rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
          />
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
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
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
