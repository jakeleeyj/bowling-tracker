const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Number whose digits roll like an odometer when the value changes */
export default function RollingNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const chars = String(value).split("");
  return (
    <span className={`relative inline-block tabular-nums ${className}`}>
      <span className="invisible">{value}</span>
      <span aria-hidden className="absolute inset-0 flex">
        {chars.map((char, i) => {
          // Key from the right so the ones column stays the ones column
          const key = chars.length - i;
          if (!/\d/.test(char)) return <span key={`s${key}`}>{char}</span>;
          return (
            <span key={key} className="h-[1lh] overflow-hidden">
              <span
                className="flex flex-col transition-transform duration-500 ease-spring motion-reduce:transition-none"
                style={{ transform: `translateY(${-Number(char)}lh)` }}
              >
                {DIGITS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
