/** The two donut rings from the reference, used for subject accuracy. */
export default function Ring({
  value,
  label,
  sublabel,
  color = "var(--brand)",
}: {
  value: number;
  label: string;
  sublabel?: string;
  color?: string;
}) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, value)) / 100) * c;

  return (
    <div className="flex items-center gap-4">
      <svg width="76" height="76" viewBox="0 0 76 76" className="flex-none">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--hairline)" strokeWidth="8" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          transform="rotate(-90 38 38)"
        />
        <text
          x="38"
          y="42"
          textAnchor="middle"
          className="num"
          style={{ fontSize: 16, fontWeight: 600, fill: "var(--ink)" }}
        >
          {Math.round(value)}%
        </text>
      </svg>
      <div>
        <p className="text-[15px] font-medium">{label}</p>
        {sublabel && (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}
