"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Trash2 } from "lucide-react";

export default function DeleteSessionButton({
  sessionId,
}: {
  sessionId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    setDeleting(true);

    // Delete frames, games, then session (cascade would be cleaner but doing it manually)
    const { data: games } = await supabase
      .from("games")
      .select("id")
      .eq("session_id", sessionId);

    const gameIds = games?.map((g: { id: string }) => g.id) ?? [];

    if (gameIds.length > 0) {
      await supabase.from("frames").delete().in("game_id", gameIds);
      await supabase
        .from("games")
        .delete()
        .eq("session_id", sessionId);
    }

    await supabase.from("sessions").delete().eq("id", sessionId);

    router.push("/profile");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red/20 py-3 text-sm font-semibold text-red transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
        >
          {deleting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-red/30 border-t-red" />
          )}
          {deleting ? "Deleting" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-lg bg-surface-light py-3 text-sm font-semibold text-text-secondary transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red/30 py-3 text-sm font-semibold text-red transition-transform duration-150 ease-out active:scale-[0.97]"
    >
      <Trash2 size={16} />
      Delete session
    </button>
  );
}
