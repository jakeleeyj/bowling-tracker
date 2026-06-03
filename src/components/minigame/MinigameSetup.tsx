"use client";

import { useState } from "react";
import { Plus, X, Play } from "lucide-react";
import {
  type MinigameRules,
  type MinigamePlayer,
  PRESETS,
  DEFAULT_RULES,
  rulesFromPreset,
} from "@/lib/minigame";

interface Props {
  onStart: (next: { players: MinigamePlayer[]; rules: MinigameRules }) => void;
}

let pidCounter = 0;
function makePlayer(name: string): MinigamePlayer {
  pidCounter += 1;
  return { id: `p-${pidCounter}-${name}`, name };
}

export default function MinigameSetup({ onStart }: Props) {
  const [names, setNames] = useState<string[]>(["", ""]);
  const [rules, setRules] = useState<MinigameRules>({ ...DEFAULT_RULES });
  const [activePreset, setActivePreset] = useState<string | null>("2-2-3");

  const validNames = names.map((n) => n.trim()).filter(Boolean);
  const canStart = validNames.length >= 2;

  function updateName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  }

  function setRuleValue(key: keyof MinigameRules, value: number) {
    setRules((r) => ({ ...r, [key]: value }));
    setActivePreset(null);
  }

  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setRules((r) => rulesFromPreset(preset, r));
    setActivePreset(id);
  }

  function start() {
    if (!canStart) return;
    onStart({ players: validNames.map(makePlayer), rules });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Players */}
      <section>
        <h2 className="mb-2 text-sm font-bold">Players</h2>
        <div className="flex flex-col gap-2">
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => updateName(i, e.target.value)}
                placeholder={`Player ${i + 1}`}
                className="glass flex-1 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue/40"
              />
              {names.length > 2 && (
                <button
                  onClick={() =>
                    setNames((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  aria-label={`Remove player ${i + 1}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-muted active:scale-95"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setNames((prev) => [...prev, ""])}
          className="mt-2 flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-blue active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} /> Add player
        </button>
      </section>

      {/* Scoring rules */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Scoring</h2>
          <div className="flex items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all active:scale-95 ${
                  activePreset === p.id
                    ? "bg-blue/15 text-blue"
                    : "bg-surface-light text-text-secondary"
                }`}
              >
                {p.label}
              </button>
            ))}
            {activePreset === null && (
              <span className="rounded-lg bg-purple/15 px-2.5 py-1 text-xs font-bold text-purple">
                Custom
              </span>
            )}
          </div>
        </div>

        <div className="glass flex flex-col divide-y divide-border">
          <RuleRow
            label="Strike"
            value={rules.strikePoints}
            onChange={(v) => setRuleValue("strikePoints", v)}
          />
          <RuleRow
            label="Spare"
            value={rules.sparePoints}
            onChange={(v) => setRuleValue("sparePoints", v)}
          />
          <RuleRow
            label="Corner pin (7 / 10)"
            value={rules.cornerPoints}
            onChange={(v) => setRuleValue("cornerPoints", v)}
          />
          <RuleRow
            label="Overall winner"
            value={rules.winnerPoints}
            onChange={(v) => setRuleValue("winnerPoints", v)}
          />
        </div>

        {/* Miss penalty toggle — tappable card (matches app toggle pattern) */}
        <button
          type="button"
          aria-pressed={rules.penaltyEnabled}
          onClick={() =>
            setRules((r) => ({ ...r, penaltyEnabled: !r.penaltyEnabled }))
          }
          className="glass mt-3 flex w-full items-center gap-3 p-4 text-left active:scale-[0.99]"
        >
          <div className="flex-1">
            <span className="block text-sm font-semibold text-white">
              Open frame penalty
            </span>
            <span className="text-xs text-text-secondary">
              {rules.penaltyEnabled
                ? `Open frame costs −${rules.cornerMissPenalty}`
                : "Open marks the frame but costs nothing"}
            </span>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              rules.penaltyEnabled
                ? "bg-red/15 text-red"
                : "bg-surface-light text-text-muted"
            }`}
          >
            {rules.penaltyEnabled ? "ON" : "OFF"}
          </span>
        </button>
      </section>

      <button
        onClick={start}
        disabled={!canStart}
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold text-white shadow-lg shadow-blue/25 transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
      >
        <Play size={18} fill="white" /> Start game
      </button>
      {!canStart && (
        <p className="-mt-2 text-center text-xs text-text-muted">
          Add at least 2 players to start
        </p>
      )}
    </div>
  );
}

function RuleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Decrease ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-light text-lg font-bold leading-none text-white active:scale-95"
        >
          −
        </button>
        <span className="w-6 text-center text-base font-bold tabular-nums text-white">
          {value}
        </span>
        <button
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-light text-lg font-bold leading-none text-white active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}
