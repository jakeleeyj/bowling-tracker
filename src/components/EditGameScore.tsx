"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Pencil, X, Check } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function EditGameScore({
  gameId,
  sessionId,
  currentScore,
}: {
  gameId: string;
  sessionId: string;
  currentScore: number;
}) {
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(currentScore.toString());
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleSave() {
    const newScore = parseInt(score, 10);
    if (isNaN(newScore) || newScore < 0 || newScore > 300) return;

    setSaving(true);
    const supabase = createClient();
    const diff = newScore - currentScore;

    await supabase
      .from("games")
      .update({ total_score: newScore })
      .eq("id", gameId);

    // Update session total_pins
    const { data: session } = await supabase
      .from("sessions")
      .select("total_pins")
      .eq("id", sessionId)
      .single();

    if (session) {
      await supabase
        .from("sessions")
        .update({ total_pins: session.total_pins + diff })
        .eq("id", sessionId);
    }

    setSaving(false);
    setEditing(false);
    toast("Score updated");
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex h-10 items-center gap-1.5 rounded-lg bg-surface-light px-3.5 text-xs font-semibold text-text-secondary transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        <Pencil size={12} />
        Edit
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={score}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, "");
          if (v === "" || (parseInt(v) >= 0 && parseInt(v) <= 300)) setScore(v);
        }}
        aria-label="Game score"
        className="h-10 w-16 rounded-lg border border-border bg-surface-light px-2 text-center text-base font-bold tabular-nums text-text-primary outline-none focus:border-blue"
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={saving}
        aria-label="Save score"
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-green/15 text-green transition-transform duration-150 ease-out active:scale-[0.94] disabled:opacity-60"
      >
        {saving ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-green/30 border-t-green" />
        ) : (
          <Check size={16} strokeWidth={3} />
        )}
      </button>
      <button
        onClick={() => {
          setScore(currentScore.toString());
          setEditing(false);
        }}
        aria-label="Cancel edit"
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-red/15 text-red transition-transform duration-150 ease-out active:scale-[0.94]"
      >
        <X size={16} strokeWidth={3} />
      </button>
    </div>
  );
}
