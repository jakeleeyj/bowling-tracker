"use client";

import { forwardRef } from "react";
import type { BallDraft } from "@/components/arsenal/DrillingSpecsForm";
import SpecSheetDiagram from "@/components/arsenal/SpecSheetDiagram";
import GripChart from "@/components/arsenal/GripChart";
import { parseMeasure } from "@/lib/flightAnalysis";
import { TWO_HANDED_PAP } from "@/lib/layoutEngine";

// Printable pro-shop spec sheet (1080×2150), white for paper. The charts sit
// on dark panels so they keep the app's colors.
const SpecSheetCard = forwardRef<HTMLDivElement, { draft: BallDraft }>(
  function SpecSheetCard({ draft }, ref) {
    const show = (v: string | undefined, unit = "") =>
      v && v.trim() !== "" ? `${v}${unit}` : "—";

    const drill = parseMeasure(draft.drilling_angle ?? "");
    const pin = parseMeasure(draft.pin_to_pap ?? "");
    const val = parseMeasure(draft.val_angle ?? "");
    const hasLayout = [drill, pin, val].every(Number.isFinite);
    const over = parseMeasure(draft.pap_over ?? "");
    const up = parseMeasure(draft.pap_up ?? "");
    const pap = Number.isFinite(over)
      ? { over, up: Number.isFinite(up) ? up : 0 }
      : draft.no_thumb
        ? { ...TWO_HANDED_PAP }
        : undefined;
    const span = parseMeasure(draft.span ?? "");

    const sections: [string, [string, string][]][] = [
      [
        "Ball",
        [
          ["Name", show(draft.name)],
          ["Brand", show(draft.brand)],
          ["Weight", show(draft.weight_lbs, " lbs")],
          ["Coverstock", show(draft.coverstock)],
          ["RG", show(draft.rg)],
          ["Differential", show(draft.differential)],
          ["Core", show(draft.core_type)],
          ["Date drilled", show(draft.date_drilled)],
        ],
      ],
      [
        "Layout",
        [
          ["Drilling angle", show(draft.drilling_angle, "°")],
          ["Pin to PAP", show(draft.pin_to_pap, '"')],
          ["VAL angle", show(draft.val_angle, "°")],
          ["Pin buffer", show(draft.pin_buffer, '"')],
          ["PSA to PAP", show(draft.psa_to_pap, '"')],
          ["Pin to COG", show(draft.pin_to_cog, '"')],
        ],
      ],
      [
        "Fit & drilling",
        [
          [
            "PAP",
            `${show(draft.pap_over, '"')} over, ${show(draft.pap_up, '"')} up`,
          ],
          ["Grip", draft.no_thumb ? "No thumb / two-handed" : "Conventional"],
          ...(draft.no_thumb
            ? ([] as [string, string][])
            : ([
                ["Span", show(draft.span, '"')],
                ["Thumb size", show(draft.thumb_size)],
                ["Thumb pitch fwd", show(draft.thumb_pitch_forward, '"')],
                ["Thumb pitch lat", show(draft.thumb_pitch_lateral, '"')],
              ] as [string, string][])),
          ["Finger size (L)", show(draft.finger_size)],
          [
            "Finger size (R)",
            show(
              draft.finger_size_2?.trim()
                ? draft.finger_size_2
                : draft.finger_size,
            ),
          ],
          ["L finger pitch fwd", show(draft.finger_pitch_forward, '"')],
          ["L finger pitch lat", show(draft.finger_pitch_lateral, '"')],
          [
            "R finger pitch fwd",
            show(
              draft.finger_pitch_forward_2?.trim()
                ? draft.finger_pitch_forward_2
                : draft.finger_pitch_forward,
              '"',
            ),
          ],
          [
            "R finger pitch lat",
            show(
              draft.finger_pitch_lateral_2?.trim()
                ? draft.finger_pitch_lateral_2
                : draft.finger_pitch_lateral,
              '"',
            ),
          ],
        ],
      ],
    ];

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 2150,
          background: "#ffffff",
          color: "#0a0e1a",
          padding: 64,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottom: "4px solid #0a0e1a",
            paddingBottom: 20,
            marginBottom: 36,
          }}
        >
          <span style={{ fontSize: 44, fontWeight: 800 }}>
            Drilling Spec Sheet
          </span>
          <span style={{ fontSize: 24, fontWeight: 600, color: "#64748b" }}>
            Spare Me?
          </span>
        </div>

        {sections.map(([title, rows]) => (
          <div key={title} style={{ marginBottom: 30 }}>
            <p
              style={{
                fontSize: 22,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 2,
                color: "#64748b",
                marginBottom: 12,
              }}
            >
              {title}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: 48,
              }}
            >
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "9px 0",
                    fontSize: 24,
                  }}
                >
                  <span style={{ color: "#475569" }}>{label}</span>
                  <span
                    style={{ fontWeight: 700, textTransform: "capitalize" }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* charts on dark panels so app colors stay legible on paper */}
        <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
          {hasLayout && (
            <div
              style={{
                flex: 1,
                background: "#0f1729",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <SpecSheetDiagram
                layout={{
                  drillingAngle: drill,
                  pinToPap: pin,
                  valAngle: val,
                }}
                system={
                  draft.no_thumb
                    ? "2ls"
                    : draft.core_type === "symmetric"
                      ? "vls"
                      : "dual"
                }
                showThumb={!draft.no_thumb}
                pap={pap}
                span={Number.isFinite(span) ? span : undefined}
              />
            </div>
          )}
          <div
            style={{
              flex: 1,
              background: "#0f1729",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <GripChart draft={draft} />
          </div>
        </div>

        {draft.notes && draft.notes.trim() !== "" && (
          <div style={{ marginTop: 24 }}>
            <p
              style={{
                fontSize: 22,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 2,
                color: "#64748b",
                marginBottom: 8,
              }}
            >
              Notes
            </p>
            <p style={{ fontSize: 24, lineHeight: 1.5 }}>{draft.notes}</p>
          </div>
        )}

        <p
          style={{
            marginTop: "auto",
            fontSize: 20,
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          Generated by Spare Me?
        </p>
      </div>
    );
  },
);

export default SpecSheetCard;
