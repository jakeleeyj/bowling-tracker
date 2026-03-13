"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Pencil, X, Check } from "lucide-react";

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

  async function handleSave() {
    const newScore = parseInt(score, 10);
    if (isNaN(newScore) || newScore < 0 || newScore > 300) return;

    setSaving(true);
    const supabase = createClient();
    const diff = newScore - currentScore;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("games")
      .update({ total_score: newScore })
      .eq("id", gameId);

    // Update session total_pins
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase as any)
      .from("sessions")
      .select("total_pins")
      .eq("id", sessionId)
      .single();

    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("sessions")
        .update({ total_pins: session.total_pins + diff })
        .eq("id", sessionId);
    }

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 rounded-lg bg-surface-light px-3 py-1.5 text-[11px] font-semibold text-text-secondary active:scale-95"
      >
        <Pencil size={12} />
        Edit
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={300}
        value={score}
        onChange={(e) => setScore(e.target.value)}
        className="w-16 rounded-lg border border-border bg-surface-light px-2 py-1.5 text-center text-sm font-bold text-text-primary outline-none focus:border-blue"
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-green/15 text-green active:scale-90 disabled:opacity-50"
      >
        <Check size={14} strokeWidth={3} />
      </button>
      <button
        onClick={() => {
          setScore(currentScore.toString());
          setEditing(false);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red/15 text-red active:scale-90"
      >
        <X size={14} strokeWidth={3} />
      </button>
    </div>
  );
}
