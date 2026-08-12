"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useToast } from "@/components/Toast";
import BackButton from "@/components/BackButton";
import DrillingSpecsForm, {
  type BallDraft,
} from "@/components/arsenal/DrillingSpecsForm";

const EMPTY_DRAFT: BallDraft = { no_thumb: false };

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function toText(value: string | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export default function NewBallPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState<BallDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft.name?.trim()) {
      toast("Ball name is required", "error");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data: ball, error } = await supabase
      .from("balls")
      .insert({
        user_id: user.id,
        name: draft.name.trim().slice(0, 60),
        brand: toText(draft.brand),
        weight_lbs: toNumber(draft.weight_lbs),
        rg: toNumber(draft.rg),
        differential: toNumber(draft.differential),
        coverstock: toText(draft.coverstock),
        core_type: toText(draft.core_type),
        drilling_angle: toNumber(draft.drilling_angle),
        pin_to_pap: toNumber(draft.pin_to_pap),
        val_angle: toNumber(draft.val_angle),
        pin_buffer: toNumber(draft.pin_buffer),
        psa_to_pap: toNumber(draft.psa_to_pap),
        pap_over: toNumber(draft.pap_over),
        pap_up: toNumber(draft.pap_up),
        span: draft.no_thumb ? null : toNumber(draft.span),
        thumb_pitch_forward: draft.no_thumb
          ? null
          : toNumber(draft.thumb_pitch_forward),
        thumb_pitch_lateral: draft.no_thumb
          ? null
          : toNumber(draft.thumb_pitch_lateral),
        finger_pitch_forward: toNumber(draft.finger_pitch_forward),
        finger_pitch_lateral: toNumber(draft.finger_pitch_lateral),
        thumb_size: draft.no_thumb ? null : toText(draft.thumb_size),
        finger_size: toText(draft.finger_size),
        no_thumb: draft.no_thumb,
        notes: toText(draft.notes),
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !ball) {
      toast("Couldn't save — check the values and try again", "error");
      return;
    }
    toast("Ball added to your arsenal");
    router.push(`/arsenal/${ball.id}`);
  }

  return (
    <div className="animate-fade-in px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-extrabold text-text-primary">Add a Ball</h1>
      </div>

      <DrillingSpecsForm draft={draft} onChange={setDraft} />

      <button
        onClick={save}
        disabled={saving}
        className="mt-5 w-full rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
      >
        {saving ? "Saving…" : "Add ball"}
      </button>
    </div>
  );
}
