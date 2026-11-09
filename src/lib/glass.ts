import type { LiquidGlassConfig } from "quick-liquid/core";

type GlassConfig = Partial<LiquidGlassConfig>;

const base: GlassConfig = { appearance: "dark", quality: "medium" };

export const navGlass: GlassConfig = {
  ...base,
  material: "thick",
  borderRadius: 32,
};

// Primary action: near-solid white glass so it stays the brightest thing on screen
export const logGlass: GlassConfig = {
  ...base,
  appearance: "light",
  material: "thin",
  borderRadius: 32,
  tintOpacity: 0.92,
};

export const logGlassActive: GlassConfig = {
  ...base,
  material: "regular",
  borderRadius: 32,
};

export const sheetGlass: GlassConfig = {
  ...base,
  material: "thick",
  borderRadius: 28,
  bezelWidth: 14,
  refractionStrength: 8,
};

export const pillGlass: GlassConfig = {
  ...base,
  material: "regular",
  borderRadius: 20,
};
