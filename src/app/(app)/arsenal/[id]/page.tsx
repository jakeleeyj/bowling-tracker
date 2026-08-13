"use client";

import { useCallback, useEffect, useState } from "react";
import { parseMeasure } from "@/lib/flightAnalysis";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useToast } from "@/components/Toast";
import { BowlingSpinner } from "@/components/Skeleton";
import ErrorCard from "@/components/ErrorCard";
import BackButton from "@/components/BackButton";
import DrillingSpecsForm, {
  draftFromBall,
  type BallDraft,
} from "@/components/arsenal/DrillingSpecsForm";
import SpecSheetButton from "@/components/arsenal/SpecSheetButton";
import BallView from "@/components/arsenal/BallView";
import GripChart from "@/components/arsenal/GripChart";
import { Trash2 } from "lucide-react";
import type { Ball } from "@/lib/database.types";

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = parseMeasure(value);
  return Number.isFinite(n) ? n : null;
}

function toText(value: string | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export default function BallPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [ball, setBall] = useState<Ball | null>(null);
  const [draft, setDraft] = useState<BallDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const { data, error: dbError } = await supabase
      .from("balls")
      .select("*")
      .eq("id", id)
      .single();
    if (dbError || !data) {
      setError(true);
    } else {
      setBall(data);
      setDraft(draftFromBall(data));
    }
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!draft || !ball) return;
    if (!draft.name?.trim()) {
      toast("Ball name is required", "error");
      return;
    }
    setSaving(true);
    const { error: dbError } = await supabase
      .from("balls")
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", ball.id);
    setSaving(false);
    if (dbError) {
      toast("Couldn't save — check the values and try again", "error");
    } else {
      toast("Ball saved");
      load();
    }
  }

  async function remove() {
    if (!ball) return;
    const { error: dbError } = await supabase
      .from("balls")
      .delete()
      .eq("id", ball.id);
    if (dbError) {
      toast("Couldn't delete", "error");
    } else {
      toast("Ball deleted");
      router.push("/arsenal");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <BowlingSpinner />
      </div>
    );
  }

  if (error || !ball || !draft) {
    return (
      <div className="px-4 py-6">
        <ErrorCard message="Couldn't load this ball" onRetry={load} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold text-text-primary">
          {ball.name}
        </h1>
        <button
          onClick={() => setConfirmDelete(true)}
          aria-label="Delete ball"
          className="text-text-muted active:scale-90"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {(() => {
        const angle = parseMeasure(draft.drilling_angle ?? "");
        const pin = parseMeasure(draft.pin_to_pap ?? "");
        const val = parseMeasure(draft.val_angle ?? "");
        if (![angle, pin, val].every(Number.isFinite)) return null;
        const over = parseMeasure(draft.pap_over ?? "");
        const up = parseMeasure(draft.pap_up ?? "");
        const pap = Number.isFinite(over)
          ? { over, up: Number.isFinite(up) ? up : 0 }
          : draft.no_thumb
            ? { over: 5, up: -1 }
            : undefined;
        return (
          <div className="glass mb-5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Layout diagram
            </p>
            <BallView
              layout={{ drillingAngle: angle, pinToPap: pin, valAngle: val }}
              system={
                draft.no_thumb
                  ? "2ls"
                  : draft.core_type === "symmetric"
                    ? "vls"
                    : "dual"
              }
              showThumb={!draft.no_thumb}
              span={
                Number.isFinite(parseMeasure(draft.span ?? ""))
                  ? parseMeasure(draft.span!)
                  : undefined
              }
              pap={pap}
              hand={
                typeof window !== "undefined" &&
                localStorage.getItem("spare-me-hand") === "left"
                  ? "left"
                  : "right"
              }
            />
          </div>
        );
      })()}

      <div className="glass mb-5 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Grip chart
        </p>
        <GripChart draft={draft} />
      </div>

      <DrillingSpecsForm draft={draft} onChange={setDraft} />

      <div className="mt-5 flex flex-col gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <SpecSheetButton ball={ball} draft={draft} />
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="glass-strong animate-scale-in w-full max-w-sm p-5">
            <p className="mb-1 text-sm font-bold text-text-primary">
              Delete {ball.name}?
            </p>
            <p className="mb-4 text-xs text-text-muted">
              This removes the ball and its drilling specs. This can&apos;t be
              undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg bg-surface-light py-2.5 text-sm font-semibold text-text-primary active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                className="flex-1 rounded-lg bg-red py-2.5 text-sm font-bold text-white active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
