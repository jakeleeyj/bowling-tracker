"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { LogOut, Award, Smartphone } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? "");
      const { data: profile } = (await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()) as { data: { display_name: string } | null };

      if (profile) setDisplayName(profile.display_name);
    }
    load();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold">Profile</h1>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-text-muted">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-light px-4 py-3 text-sm text-text-primary outline-none focus:border-blue"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-muted">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-lg border border-border bg-surface-light px-4 py-3 text-sm text-text-muted"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold shadow-lg shadow-blue/25 disabled:opacity-50"
        >
          {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
        </button>

        <Link
          href="/achievements"
          className="glass flex items-center gap-3 p-4"
        >
          <Award size={20} className="text-gold" />
          <span className="text-sm font-semibold">View Achievements</span>
        </Link>

        <button
          onClick={() => setShowInstall(!showInstall)}
          className="glass flex items-center gap-3 p-4 text-left"
        >
          <Smartphone size={20} className="text-blue" />
          <span className="text-sm font-semibold">Install as App</span>
        </button>

        {showInstall && (
          <div className="glass p-4 text-sm text-text-secondary">
            <p className="mb-3 font-semibold text-text-primary">
              Add to your home screen:
            </p>
            <div className="mb-3">
              <p className="mb-1 font-medium">iPhone / iPad (Safari)</p>
              <ol className="ml-4 list-decimal space-y-1 text-xs text-text-muted">
                <li>
                  Tap the{" "}
                  <span className="font-medium text-text-secondary">Share</span>{" "}
                  button (square with arrow)
                </li>
                <li>
                  Scroll down and tap{" "}
                  <span className="font-medium text-text-secondary">
                    Add to Home Screen
                  </span>
                </li>
                <li>
                  Tap{" "}
                  <span className="font-medium text-text-secondary">Add</span>
                </li>
              </ol>
            </div>
            <div>
              <p className="mb-1 font-medium">Android (Chrome)</p>
              <ol className="ml-4 list-decimal space-y-1 text-xs text-text-muted">
                <li>
                  Tap the{" "}
                  <span className="font-medium text-text-secondary">
                    three dots
                  </span>{" "}
                  menu
                </li>
                <li>
                  Tap{" "}
                  <span className="font-medium text-text-secondary">
                    Add to Home screen
                  </span>
                </li>
                <li>
                  Tap{" "}
                  <span className="font-medium text-text-secondary">
                    Install
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 rounded-lg border border-red/30 py-3 text-sm font-semibold text-red"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
