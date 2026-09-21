"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartPaper({ paperId }: { paperId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"exam" | "practice">("exam");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId, mode }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Could not start the paper. Try again.");
      setBusy(false);
      return;
    }
    router.push(`/exam/${data.attemptId}`);
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {(
          [
            ["exam", "Exam mode", "Full timer, results at the end"],
            ["practice", "Practice mode", "Answer revealed after each question"],
          ] as const
        ).map(([key, title, note]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className="option"
            data-selected={mode === key}
          >
            <span className="option-key">{mode === key ? "●" : ""}</span>
            <span>
              <span className="block text-[14px] font-medium">{title}</span>
              <span className="block text-[12.5px]" style={{ color: "var(--muted)" }}>
                {note}
              </span>
            </span>
          </button>
        ))}
      </div>

      <button onClick={start} disabled={busy} className="pill pill-brand mt-4 w-full justify-center">
        {busy ? "Opening the paper…" : "Start paper"}
      </button>

      {error && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
