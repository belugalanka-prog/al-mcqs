"use client";

import { useState } from "react";
import { saveQuestion } from "@/app/admin/actions";
import { CHOICES, type Choice } from "@/lib/format";
import { CheckIcon } from "@/components/icons";

type Row = {
  id: string;
  question_number: number;
  question_image_url: string;
  correct_answer: Choice;
  topic: string | null;
  review_text: string | null;
  review_image_url: string | null;
};

/**
 * One screen, every question. Press A–E to set the answer and jump to the
 * next row — a whole paper goes in without touching the mouse.
 */
export default function AnswerGrid({ paperId, rows }: { paperId: string; rows: Row[] }) {
  const [data, setData] = useState(rows);
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [openReview, setOpenReview] = useState<number | null>(null);

  async function patch(n: number, changes: Partial<Row>) {
    setData((d) => d.map((r) => (r.question_number === n ? { ...r, ...changes } : r)));
    const res = await saveQuestion(paperId, n, changes);
    if (!res?.error) {
      setSaved((s) => ({ ...s, [n]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [n]: false })), 1400);
    }
  }

  function focusRow(n: number) {
    document.getElementById(`row-${n}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    (document.querySelector(`#row-${n} button`) as HTMLButtonElement)?.focus();
  }

  return (
    <div className="flex flex-col">
      {data.map((r) => (
        <div
          key={r.id}
          id={`row-${r.question_number}`}
          className="border-t py-3.5 first:border-t-0 first:pt-0"
          style={{ borderColor: "var(--hairline)" }}
          onKeyDown={(e) => {
            const k = e.key.toUpperCase();
            if ((CHOICES as readonly string[]).includes(k)) {
              e.preventDefault();
              patch(r.question_number, { correct_answer: k as Choice });
              focusRow(r.question_number + 1);
            }
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip num w-12 justify-center">{r.question_number}</span>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.question_image_url}
              alt={`Question ${r.question_number}`}
              className="h-11 w-16 flex-none rounded-[10px] object-cover"
              style={{ border: "1px solid var(--hairline)" }}
            />

            <div className="flex gap-1.5">
              {CHOICES.map((c) => (
                <button
                  key={c}
                  onClick={() => patch(r.question_number, { correct_answer: c })}
                  className="num grid h-9 w-9 place-items-center rounded-[11px] text-[13px] font-semibold"
                  style={{
                    background: r.correct_answer === c ? "var(--brand)" : "var(--surface)",
                    color: r.correct_answer === c ? "#fff" : "var(--muted)",
                    border: `1px solid ${r.correct_answer === c ? "var(--brand)" : "var(--hairline)"}`,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <input
              defaultValue={r.topic ?? ""}
              onBlur={(e) => {
                if (e.target.value !== (r.topic ?? ""))
                  patch(r.question_number, { topic: e.target.value || null });
              }}
              placeholder="Topic"
              className="min-w-[140px] flex-1 rounded-[11px] px-3 py-2 text-[13px]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
                color: "var(--ink)",
              }}
            />

            <button
              onClick={() =>
                setOpenReview(openReview === r.question_number ? null : r.question_number)
              }
              className={`pill ${r.review_text || r.review_image_url ? "pill-soft" : "pill-ghost"}`}
            >
              {r.review_text || r.review_image_url ? "Answer written" : "Add answer"}
            </button>

            <span
              className="w-5"
              style={{ color: "var(--ok)", opacity: saved[r.question_number] ? 1 : 0 }}
            >
              <CheckIcon size={18} />
            </span>
          </div>

          {openReview === r.question_number && (
            <textarea
              defaultValue={r.review_text ?? ""}
              onBlur={(e) => patch(r.question_number, { review_text: e.target.value || null })}
              rows={4}
              placeholder="Worked answer shown after submission. Plain text or LaTeX, e.g. a = (v - u) / t"
              className="mt-3 w-full rounded-[14px] p-4 text-[14px]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
                color: "var(--ink)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
