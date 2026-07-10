"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { isNativeApp } from "@/lib/platform";

const NATIVE_REDIRECT = "com.jakelee.spareme://auth-callback";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l4-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l4 3.09C6.23 6.88 8.88 4.77 12 4.77z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.38C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export default function OAuthButtons() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");

  // Native shell: the system browser redirects back via deep link with a PKCE
  // code — exchange it for a session here.
  useEffect(() => {
    if (!isNativeApp()) return;
    let cleanup: (() => void) | undefined;
    (async () => {
      const { App } = await import("@capacitor/app");
      const listener = await App.addListener("appUrlOpen", async ({ url }) => {
        if (!url.startsWith(NATIVE_REDIRECT)) return;
        const code = new URL(url).searchParams.get("code");
        if (!code) return;
        const { Browser } = await import("@capacitor/browser");
        await Browser.close().catch(() => {});
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError("Sign-in failed. Please try again.");
          return;
        }
        router.push("/dashboard");
        router.refresh();
      });
      cleanup = () => listener.remove();
    })();
    return () => cleanup?.();
  }, [supabase, router]);

  async function signIn(provider: "google" | "apple") {
    setError("");
    setLoading(provider);

    if (isNativeApp()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
      });
      if (error || !data.url) {
        setError("Sign-in failed. Please try again.");
        setLoading(null);
        return;
      }
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url });
      setLoading(null);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("Sign-in failed. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => signIn("google")}
        disabled={loading !== null}
        className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-light py-3 text-sm font-semibold text-text-primary transition-transform active:scale-[0.97] disabled:opacity-50"
      >
        <GoogleIcon />
        {loading === "google" ? "Connecting..." : "Continue with Google"}
      </button>
      <button
        type="button"
        onClick={() => signIn("apple")}
        disabled={loading !== null}
        className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-light py-3 text-sm font-semibold text-text-primary transition-transform active:scale-[0.97] disabled:opacity-50"
      >
        <AppleIcon />
        {loading === "apple" ? "Connecting..." : "Continue with Apple"}
      </button>
      {error && <p className="text-center text-sm text-red">{error}</p>}
    </div>
  );
}
