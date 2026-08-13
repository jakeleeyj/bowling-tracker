"use client";

import { useState } from "react";
import type { Ball } from "@/lib/database.types";
import { BALL_BRANDS } from "@/lib/brands";
import { parseMeasure } from "@/lib/flightAnalysis";
import {
  dualAngleToVLS,
  dualAngleTo2LS,
  vlsToDualAngle,
  twoLSToDualAngle,
  TWO_HANDED_PAP,
} from "@/lib/layoutEngine";

export type BallDraft = Partial<
  Record<
    keyof Omit<
      Ball,
      "id" | "user_id" | "created_at" | "updated_at" | "no_thumb"
    >,
    string
  >
> & { no_thumb: boolean; pin_to_cog?: string };

export function draftFromBall(ball: Ball): BallDraft {
  const str = (v: string | number | null) => (v === null ? "" : String(v));
  const draft: BallDraft = {
    name: str(ball.name),
    brand: str(ball.brand),
    weight_lbs: str(ball.weight_lbs),
    rg: str(ball.rg),
    differential: str(ball.differential),
    coverstock: str(ball.coverstock),
    core_type: str(ball.core_type),
    drilling_angle: str(ball.drilling_angle),
    pin_to_pap: str(ball.pin_to_pap),
    val_angle: str(ball.val_angle),
    pin_buffer: str(ball.pin_buffer),
    psa_to_pap: str(ball.psa_to_pap),
    pap_over: str(ball.pap_over),
    pap_up: str(ball.pap_up),
    span: str(ball.span),
    thumb_pitch_forward: str(ball.thumb_pitch_forward),
    thumb_pitch_lateral: str(ball.thumb_pitch_lateral),
    finger_pitch_forward: str(ball.finger_pitch_forward),
    finger_pitch_lateral: str(ball.finger_pitch_lateral),
    finger_pitch_forward_2: str(ball.finger_pitch_forward_2),
    finger_pitch_lateral_2: str(ball.finger_pitch_lateral_2),
    thumb_size: str(ball.thumb_size),
    finger_size: str(ball.finger_size),
    finger_size_2: str(ball.finger_size_2),
    date_drilled: str(ball.date_drilled),
    notes: str(ball.notes),
    no_thumb: ball.no_thumb,
  };
  if (
    ball.drilling_angle !== null &&
    ball.pin_to_pap !== null &&
    ball.val_angle !== null
  ) {
    const cog = dualAngleTo2LS(
      {
        drillingAngle: ball.drilling_angle,
        pinToPap: Number(ball.pin_to_pap),
        valAngle: ball.val_angle,
      },
      draftPap(draft),
    ).pinToCog;
    draft.pin_to_cog = String(cog);
  }
  return draft;
}

// The bowler's fit barely changes between balls — remember it on the device
// so Add a Ball starts prefilled with the last drilling specs.
const LAST_SPECS_KEY = "spare-me-last-specs";
const SPEC_FIELDS = [
  "span",
  "pap_over",
  "pap_up",
  "finger_size",
  "finger_size_2",
  "finger_pitch_forward",
  "finger_pitch_lateral",
  "finger_pitch_forward_2",
  "finger_pitch_lateral_2",
  "thumb_size",
  "thumb_pitch_forward",
  "thumb_pitch_lateral",
] as const;

export function saveLastSpecs(draft: BallDraft): void {
  const specs: Record<string, string | boolean> = { no_thumb: draft.no_thumb };
  for (const key of SPEC_FIELDS) {
    const v = draft[key];
    if (typeof v === "string" && v.trim() !== "") specs[key] = v;
  }
  localStorage.setItem(LAST_SPECS_KEY, JSON.stringify(specs));
}

export function loadLastSpecs(): Partial<BallDraft> {
  try {
    const raw = localStorage.getItem(LAST_SPECS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function draftPap(draft: BallDraft): { over: number; up: number } {
  const over = parseMeasure(draft.pap_over ?? "");
  const up = parseMeasure(draft.pap_up ?? "");
  if (Number.isFinite(over)) return { over, up: Number.isFinite(up) ? up : 0 };
  return draft.no_thumb ? { ...TWO_HANDED_PAP } : { over: 4.5, up: 0 };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-muted">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "e.g. 3 3/8"}
        className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm capitalize text-text-primary outline-none focus:border-blue"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o} className="capitalize">
            {o.charAt(0).toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

type LayoutTab = "dual" | "vls" | "2ls";

export default function DrillingSpecsForm({
  draft,
  onChange,
}: {
  draft: BallDraft;
  onChange: (draft: BallDraft) => void;
}) {
  const [layoutTab, setLayoutTab] = useState<LayoutTab>(
    draft.no_thumb ? "2ls" : "dual",
  );

  const set = (key: keyof BallDraft) => (v: string) =>
    onChange({ ...draft, [key]: v });

  // Editing any layout field re-derives the other systems' numbers so all
  // columns stay consistent no matter which notation was typed.
  function setLayoutField(key: keyof BallDraft, v: string) {
    const next: BallDraft = { ...draft, [key]: v };
    const pap = draftPap(next);
    const pin = parseMeasure(next.pin_to_pap ?? "");
    if (!Number.isFinite(pin)) {
      onChange(next);
      return;
    }
    let dual: {
      drillingAngle: number;
      pinToPap: number;
      valAngle: number;
    } | null = null;
    if (layoutTab === "dual") {
      const drill = parseMeasure(next.drilling_angle ?? "");
      const val = parseMeasure(next.val_angle ?? "");
      if (Number.isFinite(drill) && Number.isFinite(val))
        dual = { drillingAngle: drill, pinToPap: pin, valAngle: val };
    } else if (layoutTab === "vls") {
      const buffer = parseMeasure(next.pin_buffer ?? "");
      const psa = parseMeasure(next.psa_to_pap ?? "");
      if (Number.isFinite(buffer))
        dual = vlsToDualAngle(
          { pinToPap: pin, pinBuffer: buffer },
          Number.isFinite(psa) ? psa : undefined,
        );
    } else {
      const psa = parseMeasure(next.psa_to_pap ?? "");
      const cog = parseMeasure(next.pin_to_cog ?? "");
      if (Number.isFinite(psa) && Number.isFinite(cog))
        dual = twoLSToDualAngle(
          { pinToPap: pin, psaToPap: psa, pinToCog: cog },
          pap,
        );
    }
    if (dual) {
      const vls = dualAngleToVLS(dual);
      const twoLS = dualAngleTo2LS(dual, pap);
      if (layoutTab !== "dual") {
        next.drilling_angle = String(dual.drillingAngle);
        next.val_angle = String(dual.valAngle);
      }
      if (layoutTab !== "vls") next.pin_buffer = String(vls.pinBuffer);
      if (layoutTab !== "2ls") {
        next.psa_to_pap = String(twoLS.psaToPap);
        next.pin_to_cog = String(twoLS.pinToCog);
      }
    }
    onChange(next);
  }

  const layoutField = (key: keyof BallDraft, label: string) => (
    <Field
      label={label}
      value={(draft[key] as string) ?? ""}
      onChange={(v) => setLayoutField(key, v)}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="glass p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Ball
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Name"
            value={draft.name ?? ""}
            onChange={set("name")}
            placeholder="e.g. Phaze II"
          />
          <Select
            label="Brand"
            value={draft.brand ?? ""}
            onChange={set("brand")}
            options={
              draft.brand?.trim() && !BALL_BRANDS.includes(draft.brand)
                ? [draft.brand, ...BALL_BRANDS]
                : BALL_BRANDS
            }
          />
          <Field
            label="Weight (lbs)"
            value={draft.weight_lbs ?? ""}
            onChange={set("weight_lbs")}
            placeholder="e.g. 15"
          />
          <Select
            label="Coverstock"
            value={draft.coverstock ?? ""}
            onChange={set("coverstock")}
            options={["solid", "pearl", "hybrid", "urethane", "plastic"]}
          />
          <Field
            label="RG"
            value={draft.rg ?? ""}
            onChange={set("rg")}
            placeholder="2.46–2.80"
          />
          <Field
            label="Differential"
            value={draft.differential ?? ""}
            onChange={set("differential")}
            placeholder="0–0.060"
          />
          <Select
            label="Core"
            value={draft.core_type ?? ""}
            onChange={set("core_type")}
            options={["symmetric", "asymmetric"]}
          />
        </div>
      </div>

      <div className="glass p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Layout
        </p>
        <div className="mb-3 flex rounded-lg bg-surface-light p-1">
          {(
            [
              ["dual", "Dual Angle"],
              ["vls", "VLS"],
              ["2ls", "2LS"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setLayoutTab(value)}
              className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all duration-150 ${
                layoutTab === value
                  ? "bg-blue/20 text-blue"
                  : "text-text-muted active:scale-95"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {layoutTab === "dual" && (
            <>
              {layoutField("drilling_angle", "Drill angle °")}
              {layoutField("pin_to_pap", 'Pin-to-PAP "')}
              {layoutField("val_angle", "VAL angle °")}
            </>
          )}
          {layoutTab === "vls" && (
            <>
              {layoutField("pin_to_pap", 'Pin-to-PAP "')}
              {layoutField("psa_to_pap", 'PSA-to-PAP "')}
              {layoutField("pin_buffer", 'Pin buffer "')}
            </>
          )}
          {layoutTab === "2ls" && (
            <>
              {layoutField("pin_to_pap", 'Pin-to-PAP "')}
              {layoutField("psa_to_pap", 'PSA-to-PAP "')}
              {layoutField("pin_to_cog", 'Pin-to-COG "')}
            </>
          )}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
          Enter the system you know — the others are filled in automatically.
        </p>
      </div>

      <div className="glass p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Drilling specs
          </p>
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={draft.no_thumb}
              onChange={(e) =>
                onChange({ ...draft, no_thumb: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--color-blue)]"
            />
            No thumb / two-handed
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={'PAP over "'}
            value={draft.pap_over ?? ""}
            onChange={set("pap_over")}
            placeholder="e.g. 4 1/2"
          />
          <Field
            label={'PAP up " (− = down)'}
            value={draft.pap_up ?? ""}
            onChange={set("pap_up")}
            placeholder="e.g. 1/2"
          />
          {!draft.no_thumb && (
            <Field
              label={'Span "'}
              value={draft.span ?? ""}
              onChange={set("span")}
              placeholder="e.g. 4 1/4"
            />
          )}
          <Field
            label="Finger size (left)"
            value={draft.finger_size ?? ""}
            onChange={set("finger_size")}
            placeholder={'e.g. 43/64"'}
          />
          <Field
            label="Finger size (right)"
            value={draft.finger_size_2 ?? ""}
            onChange={set("finger_size_2")}
            placeholder="same as left"
          />
          <Field
            label={'L finger pitch fwd "'}
            value={draft.finger_pitch_forward ?? ""}
            onChange={set("finger_pitch_forward")}
            placeholder="e.g. 3/8"
          />
          <Field
            label={'L finger pitch lat "'}
            value={draft.finger_pitch_lateral ?? ""}
            onChange={set("finger_pitch_lateral")}
            placeholder="e.g. 1/4"
          />
          <Field
            label={'R finger pitch fwd "'}
            value={draft.finger_pitch_forward_2 ?? ""}
            onChange={set("finger_pitch_forward_2")}
            placeholder="same as left"
          />
          <Field
            label={'R finger pitch lat "'}
            value={draft.finger_pitch_lateral_2 ?? ""}
            onChange={set("finger_pitch_lateral_2")}
            placeholder="same as left"
          />
          {!draft.no_thumb && (
            <>
              <Field
                label="Thumb size"
                value={draft.thumb_size ?? ""}
                onChange={set("thumb_size")}
                placeholder={'e.g. 51/64"'}
              />
              <Field
                label={'Thumb pitch fwd " (− = reverse)'}
                value={draft.thumb_pitch_forward ?? ""}
                onChange={set("thumb_pitch_forward")}
                placeholder="e.g. -1/8"
              />
              <Field
                label={'Thumb pitch lat "'}
                value={draft.thumb_pitch_lateral ?? ""}
                onChange={set("thumb_pitch_lateral")}
                placeholder="e.g. 1/16"
              />
            </>
          )}
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-text-muted">
            Date drilled
          </label>
          <input
            type="date"
            value={draft.date_drilled ?? ""}
            onChange={(e) =>
              onChange({ ...draft, date_drilled: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-text-primary outline-none focus:border-blue"
          />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-text-muted">Notes</label>
          <textarea
            value={draft.notes ?? ""}
            onChange={(e) => onChange({ ...draft, notes: e.target.value })}
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-text-primary outline-none focus:border-blue"
          />
        </div>
      </div>
    </div>
  );
}
