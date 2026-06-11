function Dots({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 text-xs font-bold text-muted">{label}</span>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i < count ? color : "bg-surface-2"}`}
        />
      ))}
    </div>
  );
}

export default function CountDots({
  balls,
  strikes,
  outs,
}: {
  balls: number;
  strikes: number;
  outs: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Dots label="B" count={Math.min(balls, 3)} max={3} color="bg-good" />
      <Dots label="S" count={Math.min(strikes, 2)} max={2} color="bg-amber-400" />
      <Dots label="O" count={Math.min(outs, 2)} max={2} color="bg-live" />
    </div>
  );
}
