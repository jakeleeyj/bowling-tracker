"use client";

import type { Ball } from "@/lib/database.types";

export type BallDraft = Partial<
  Record<
    keyof Omit<
      Ball,
      "id" | "user_id" | "created_at" | "updated_at" | "no_thumb"
    >,
    string
  >
> & { no_thumb: boolean };

export function draftFromBall(ball: Ball): BallDraft {
  const str = (v: string | number | null) => (v === null ? "" : String(v));
  return {
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
    thumb_size: str(ball.thumb_size),
    finger_size: str(ball.finger_size),
    notes: str(ball.notes),
    no_thumb: ball.no_thumb,
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-muted">{label}</label>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
        className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-text-primary outline-none focus:border-blue"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function DrillingSpecsForm({
  draft,
  onChange,
}: {
  draft: BallDraft;
  onChange: (draft: BallDraft) => void;
}) {
  const set = (key: keyof BallDraft) => (v: string) =>
    onChange({ ...draft, [key]: v });

  return (
    <div className="flex flex-col gap-5">
      <div className="glass p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Ball
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" value={draft.name ?? ""} onChange={set("name")} />
          <Field
            label="Brand"
            value={draft.brand ?? ""}
            onChange={set("brand")}
          />
          <Field
            label="Weight (lbs)"
            type="number"
            value={draft.weight_lbs ?? ""}
            onChange={set("weight_lbs")}
          />
          <Select
            label="Coverstock"
            value={draft.coverstock ?? ""}
            onChange={set("coverstock")}
            options={["solid", "pearl", "hybrid", "urethane", "plastic"]}
          />
          <Field
            label="RG"
            type="number"
            placeholder="2.46–2.80"
            value={draft.rg ?? ""}
            onChange={set("rg")}
          />
          <Field
            label="Differential"
            type="number"
            placeholder="0–0.060"
            value={draft.differential ?? ""}
            onChange={set("differential")}
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
        <div className="grid grid-cols-3 gap-3">
          <Field
            label="Drill angle °"
            type="number"
            value={draft.drilling_angle ?? ""}
            onChange={set("drilling_angle")}
          />
          <Field
            label={'Pin-to-PAP "'}
            type="number"
            value={draft.pin_to_pap ?? ""}
            onChange={set("pin_to_pap")}
          />
          <Field
            label="VAL angle °"
            type="number"
            value={draft.val_angle ?? ""}
            onChange={set("val_angle")}
          />
          <Field
            label={'Pin buffer "'}
            type="number"
            value={draft.pin_buffer ?? ""}
            onChange={set("pin_buffer")}
          />
          <Field
            label={'PSA-to-PAP "'}
            type="number"
            value={draft.psa_to_pap ?? ""}
            onChange={set("psa_to_pap")}
          />
        </div>
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
            type="number"
            placeholder="e.g. 4.5"
            value={draft.pap_over ?? ""}
            onChange={set("pap_over")}
          />
          <Field
            label={'PAP up "'}
            type="number"
            placeholder="e.g. 0.5"
            value={draft.pap_up ?? ""}
            onChange={set("pap_up")}
          />
          {!draft.no_thumb && (
            <Field
              label={'Span "'}
              type="number"
              placeholder="e.g. 4.25"
              value={draft.span ?? ""}
              onChange={set("span")}
            />
          )}
          <Field
            label="Finger size"
            placeholder={'e.g. 31/32"'}
            value={draft.finger_size ?? ""}
            onChange={set("finger_size")}
          />
          <Field
            label={'Finger pitch fwd "'}
            type="number"
            placeholder="e.g. 0.375"
            value={draft.finger_pitch_forward ?? ""}
            onChange={set("finger_pitch_forward")}
          />
          <Field
            label={'Finger pitch lat "'}
            type="number"
            value={draft.finger_pitch_lateral ?? ""}
            onChange={set("finger_pitch_lateral")}
          />
          {!draft.no_thumb && (
            <>
              <Field
                label="Thumb size"
                placeholder={'e.g. 1"'}
                value={draft.thumb_size ?? ""}
                onChange={set("thumb_size")}
              />
              <Field
                label={'Thumb pitch fwd " (− = reverse)'}
                type="number"
                placeholder="e.g. -0.25"
                value={draft.thumb_pitch_forward ?? ""}
                onChange={set("thumb_pitch_forward")}
              />
              <Field
                label={'Thumb pitch lat "'}
                type="number"
                value={draft.thumb_pitch_lateral ?? ""}
                onChange={set("thumb_pitch_lateral")}
              />
            </>
          )}
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
