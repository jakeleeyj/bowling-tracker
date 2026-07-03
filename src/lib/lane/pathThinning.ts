export function thinPath<T>(path: T[], maxPoints = 60): T[] {
  if (path.length <= maxPoints) {
    return path;
  }
  const step = Math.max(1, Math.ceil(path.length / maxPoints));
  return path.filter((_, i) => i % step === 0 || i === path.length - 1);
}
