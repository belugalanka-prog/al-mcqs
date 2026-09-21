import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return <section className={`card ${pad ? "card-pad" : ""} ${className}`}>{children}</section>;
}

export function CardHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[17px]">{title}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div>
      <p className="num text-2xl font-semibold" style={{ color: tone ?? "var(--ink)" }}>
        {value}
      </p>
      <p className="mt-0.5 text-[13px]" style={{ color: "var(--muted)" }}>
        {label}
      </p>
    </div>
  );
}
