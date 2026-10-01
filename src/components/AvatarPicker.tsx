"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Trash2 } from "lucide-react";
import Avatar, {
  AVATAR_GRADIENTS,
  gradientTag,
  parseGradientTag,
} from "./Avatar";

const PRESET_AVATARS = [
  { id: "bowling", emoji: "🎳" },
  { id: "fire", emoji: "🔥" },
  { id: "star", emoji: "⭐" },
  { id: "crown", emoji: "👑" },
  { id: "bolt", emoji: "⚡" },
  { id: "target", emoji: "🎯" },
  { id: "skull", emoji: "💀" },
  { id: "rocket", emoji: "🚀" },
];

export default function AvatarPicker({
  name,
  currentUrl,
  onAvatarChange,
}: {
  name: string;
  currentUrl: string | null;
  onAvatarChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/avatar", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const { avatarUrl } = await res.json();
      onAvatarChange(avatarUrl);
    }
    setUploading(false);
    setShowPicker(false);
  }

  async function handleColour(index: number) {
    setUploading(true);
    const res = await fetch("/api/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: gradientTag(index) }),
    });
    if (res.ok) onAvatarChange(gradientTag(index));
    setUploading(false);
    setShowPicker(false);
  }

  async function handleRemove() {
    setUploading(true);
    const res = await fetch("/api/avatar", { method: "DELETE" });
    if (res.ok) onAvatarChange(null);
    setUploading(false);
    setShowPicker(false);
  }

  async function handlePreset(emoji: string) {
    // Create a small canvas with the emoji as avatar
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;

    // Dark background
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();

    // Emoji
    ctx.font = "64px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 64, 68);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "avatar.png", { type: "image/png" });
      await handleUpload(file);
    }, "image/png");
  }

  return (
    <div>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="group relative"
        disabled={uploading}
      >
        <Avatar name={name} avatarUrl={currentUrl} size="lg" />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
          <Camera size={18} />
        </div>
      </button>

      {showPicker && (
        <div className="animate-slide-down mt-3 glass p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Choose a colour
          </p>
          <div className="mb-3 flex justify-between">
            {AVATAR_GRADIENTS.map((g, i) => (
              <button
                key={g}
                onClick={() => handleColour(i)}
                disabled={uploading}
                aria-label={`Colour ${i + 1}`}
                className={`h-9 w-9 rounded-full bg-gradient-to-br ${g} active:scale-90 disabled:opacity-50 ${
                  parseGradientTag(currentUrl) === i
                    ? "ring-2 ring-white ring-offset-2 ring-offset-surface"
                    : ""
                }`}
              />
            ))}
          </div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Or an avatar
          </p>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {PRESET_AVATARS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePreset(p.emoji)}
                disabled={uploading}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-surface-light text-2xl active:scale-90 disabled:opacity-50"
              >
                {p.emoji}
              </button>
            ))}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-xs font-semibold text-text-secondary active:scale-[0.97] disabled:opacity-50"
          >
            <Upload size={14} />
            {uploading ? "Uploading..." : "Upload Photo"}
          </button>
          {currentUrl && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-text-muted active:scale-[0.97] disabled:opacity-50"
            >
              <Trash2 size={14} />
              Remove and use default
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </div>
      )}
    </div>
  );
}
