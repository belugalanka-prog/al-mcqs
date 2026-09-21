"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CHOICES, clock, type Choice } from "@/lib/format";
import { ArrowIcon, GridIcon, CheckIcon, CrossIcon } from "@/components/icons";

type Question = {
  id: string;
  question_number: number;
  question_image_url: string;
  topic: string | null;
};

type Reveal = {
  correct: Choice;
  isCorrect: boolean;
  reviewText: string | null;
  reviewImage: string | null;
};

export default function ExamRunner({
  attemptId,
  paperTitle,
  mode,
  expiresAt,
  questions,
  initialAnswers,
}: {
  attemptId: string;
  paperTitle: string;
  mode: "exam" | "practice";
  expiresAt: string;
  questions: Question[];
  initialAnswers: Record<string, Choice>;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Choice>>(initialAnswers);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, (new Date(expiresAt).getTime() - Date.now()) / 1000)
  );
  const [navOpen, setNavOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");

  const question = questions[index];
  const answered = Object.keys(answers).length;
  const enteredAt = useRef(Date.now());
  const submittedRef = useRef(false);

  // --- submission -----------------------------------------------------
  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
    if (!res.ok && res.status !== 409) {
      submittedRef.current = false;
      setSubmitting(false);
      return;
    }
    router.replace(`/results/${attemptId}`);
  }, [attemptId, router]);

  // --- timer: derived from the server deadline, never accumulated -----
  useEffect(() => {
    const t = setInterval(() => {
      const left = (new Date(expiresAt).getTime() - Date.now()) / 1000;
      setRemaining(Math.max(0, left));
      if (left <= 0) submit();
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, submit]);

  useEffect(() => {
    enteredAt.current = Date.now();
    setReveal(null);
  }, [index]);

  // --- answering ------------------------------------------------------
  async function choose(choice: Choice) {
    if (reveal) return; // practice mode: locked once revealed
    setAnswers((prev) => ({ ...prev, [question.id]: choice }));
    setSaveState("saving");

    const res = await fetch(`/api/attempts/${attemptId}/answers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        selected: choice,
        timeSpent: Math.round((Date.now() - enteredAt.current) / 1000),
      }),
    });

    setSaveState(res.ok ? "idle" : "error");
  }

  async function revealAnswer() {
    const res = await fetch(`/api/attempts/${attemptId}/reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id }),
    });
    if (res.ok) setReveal(await res.json());
  }

  // --- keyboard -------------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (confirming || navOpen) return;
      const k = e.key.toUpperCase();
      if ((CHOICES as readonly string[]).includes(k)) choose(k as Choice);
      if (e.key === "ArrowRight") setIndex((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const low = remaining < 300;

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--canvas)" }}>
      {/* ---- header strip ---- */}
      <header
        className="sticky top-0 z-30 border-b px-4 py-3"
        style={{
          background: "var(--surface)",
          borderColor: "var(--hairline)",
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="mx-auto flex max-w-[860px] items-center gap-3">
          <p className="truncate text-[14px] font-medium">{paperTitle}</p>
          <p className="num ml-auto text-[14px]" style={{ color: "var(--muted)" }}>
            {index + 1} / {questions.length}
          </p>
          <p
            className="num rounded-full px-3 py-1 text-[14px] font-semibold"
            style={{
              background: low ? "rgba(240,71,108,.1)" : "var(--brand-soft)",
              color: low ? "var(--bad)" : "var(--brand)",
            }}
          >
            {clock(remaining)}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-4 pt-5">
        {saveState === "error" && (
          <p
            className="mb-3 rounded-[14px] px-4 py-3 text-[13px]"
            style={{ background: "rgba(240,71,108,.08)", color: "var(--bad)" }}
          >
            That answer did not save. Check your connection and tap the option again.
          </p>
        )}

        <div className="card overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.question_image_url}
            alt={`Question ${question.question_number}`}
            className="w-full"
            style={{ maxWidth: "100%" }}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {CHOICES.map((c) => {
            const selected = answers[question.id] === c;
            let state: string | undefined;
            if (reveal) {
              if (c === reveal.correct) state = "correct";
              else if (selected) state = "wrong";
            }
            return (
              <button
                key={c}
                onClick={() => choose(c)}
                className="option"
                data-selected={selected}
                data-state={state}
                aria-pressed={selected}
              >
                <span className="option-key">{c}</span>
                <span className="text-[14px]" style={{ color: "var(--muted)" }}>
                  Option {c}
                </span>
                {reveal && c === reveal.correct && (
                  <CheckIcon size={18} className="ml-auto" />
                )}
                {reveal && selected && c !== reveal.correct && (
                  <CrossIcon size={18} className="ml-auto" />
                )}
              </button>
            );
          })}
        </div>

        {mode === "practice" && (
          <div className="mt-4">
            {!reveal ? (
              <button
                onClick={revealAnswer}
                disabled={!answers[question.id]}
                className="pill pill-soft w-full justify-center disabled:opacity-50"
              >
                Check this answer
              </button>
            ) : (
              <div className="card card-pad mt-1">
                <p
                  className="text-[14px] font-medium"
                  style={{ color: reveal.isCorrect ? "var(--ok)" : "var(--bad)" }}
                >
                  {reveal.isCorrect ? "Correct" : `Correct answer is ${reveal.correct}`}
                </p>
                {reveal.reviewText && (
                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed">
                    {reveal.reviewText}
                  </p>
                )}
                {reveal.reviewImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reveal.reviewImage} alt="Worked answer" className="mt-3 w-full rounded-[14px]" />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ---- footer controls ---- */}
      <footer
        className="fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3"
        style={{
          background: "var(--surface)",
          borderColor: "var(--hairline)",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto flex max-w-[860px] items-center gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="pill pill-ghost disabled:opacity-40"
          >
            Previous
          </button>

          <button onClick={() => setNavOpen(true)} className="pill pill-soft" aria-label="All questions">
            <GridIcon size={16} />
            <span className="num">{answered}/{questions.length}</span>
          </button>

          {index === questions.length - 1 ? (
            <button onClick={() => setConfirming(true)} className="pill pill-brand ml-auto">
              Submit paper
            </button>
          ) : (
            <button
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="pill pill-brand ml-auto"
            >
              Next <ArrowIcon size={16} />
            </button>
          )}
        </div>
      </footer>

      {/* ---- question navigator ---- */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center p-3 sm:items-center"
          style={{ background: "rgba(27,24,52,.45)" }}
          onClick={() => setNavOpen(false)}
        >
          <div className="card card-pad w-full max-w-[520px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px]">All questions</h2>
              <button onClick={() => setNavOpen(false)} className="pill pill-ghost">
                Close
              </button>
            </div>

            <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
              {questions.map((q, i) => {
                const done = !!answers[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setIndex(i);
                      setNavOpen(false);
                    }}
                    className="num grid h-10 place-items-center rounded-[12px] text-[13px] font-medium"
                    style={{
                      background: done ? "var(--brand)" : "var(--surface)",
                      color: done ? "#fff" : "var(--muted)",
                      border: `1px solid ${i === index ? "var(--brand)" : "var(--hairline)"}`,
                    }}
                  >
                    {q.question_number}
                  </button>
                );
              })}
            </div>

            <button onClick={() => setConfirming(true)} className="pill pill-brand mt-5 w-full justify-center">
              Submit paper
            </button>
          </div>
        </div>
      )}

      {/* ---- submit confirmation ---- */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: "rgba(27,24,52,.45)" }}
        >
          <div className="card card-pad w-full max-w-[400px]">
            <h2 className="text-[18px]">Submit this paper?</h2>
            <p className="mt-2 text-[14px]" style={{ color: "var(--muted)" }}>
              {questions.length - answered > 0
                ? `${questions.length - answered} question${
                    questions.length - answered === 1 ? "" : "s"
                  } still have no answer. They will be marked as unanswered.`
                : "Every question has an answer. Marking happens straight away."}
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirming(false)} className="pill pill-ghost flex-1 justify-center">
                Keep working
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="pill pill-brand flex-1 justify-center"
              >
                {submitting ? "Marking…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
