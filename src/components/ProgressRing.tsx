export default function ProgressRing({ value, max = 500, size = 140, stroke = 12 }:{
  value: number; max?: number; size?: number; stroke?: number;
}) {
  const pct = Math.min(value / max, 1);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} stroke="#2A3442" strokeWidth={stroke} fill="none" />
      <circle
        cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={c - c*pct} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} className="text-sunset"
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="font-semibold fill-white">
        {Math.min(value, max)}
      </text>
    </svg>
  );
}
