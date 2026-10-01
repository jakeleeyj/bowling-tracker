import Image from "next/image";

export const AVATAR_GRADIENTS = [
  "from-blue to-indigo-500",
  "from-purple to-fuchsia-500",
  "from-pink to-rose-500",
  "from-green to-emerald-500",
  "from-gold to-orange-500",
  "from-cyan-500 to-blue",
];

// A chosen colour is stored in avatar_url as "gradient:<index>".
const GRADIENT_TAG = /^gradient:(\d)$/;

export function gradientTag(index: number): string {
  return `gradient:${index}`;
}

export function parseGradientTag(value: string | null | undefined): number | null {
  const m = value?.match(GRADIENT_TAG);
  if (!m) return null;
  const i = Number(m[1]);
  return i < AVATAR_GRADIENTS.length ? i : null;
}

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

const SIZES = {
  sm: { container: "h-7 w-7", text: "text-[10px]" },
  md: { container: "h-10 w-10", text: "text-base" },
  lg: { container: "h-14 w-14", text: "text-xl" },
};

export default function Avatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const s = SIZES[size];
  const chosen = parseGradientTag(avatarUrl);

  if (avatarUrl && chosen === null) {
    const dim = size === "lg" ? 56 : size === "md" ? 40 : 28;
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={dim}
        height={dim}
        className={`${s.container} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`flex ${s.container} shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${chosen !== null ? AVATAR_GRADIENTS[chosen] : getGradient(name)} ${s.text} font-bold`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Re-export for backward compat where gradient string is needed directly
export { getGradient as getAvatarGradient };
