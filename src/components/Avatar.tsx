const AVATAR_GRADIENTS = [
  "from-blue to-indigo-500",
  "from-purple to-fuchsia-500",
  "from-pink to-rose-500",
  "from-green to-emerald-500",
  "from-gold to-orange-500",
  "from-cyan-500 to-blue",
];

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

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${s.container} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`flex ${s.container} shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getGradient(name)} ${s.text} font-bold`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Re-export for backward compat where gradient string is needed directly
export { getGradient as getAvatarGradient };
