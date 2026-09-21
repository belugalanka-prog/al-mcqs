import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AppShell from "@/components/app-shell";
import TopBar from "@/components/topbar";
import { Card, CardHead } from "@/components/card";
import AdSlot from "@/components/ad-slot";
import { CheckIcon, CrossIcon } from "@/components/icons";
import { clock } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { user } = await requireUser();
  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("attempts")
    .select("*, papers(title, subject, total_questions)")
    .eq("id", attemptId)
    .single();

  if (!attempt || attempt.user_id !== user.id || !attempt.completed_at) notFound();

  // Safe to include correct answers now: the attempt is closed.
  const { data: rows } = await admin
    .from("attempt_answers")
    .select(
      "selected_answer, is_correct, questions(id, question_number, question_image_url, topic, correct_answer, review_text, review_image_url)"
    )
    .eq("attempt_id", attemptId);

  const items = (rows ?? []).sort(
    (a, b) => ((a.questions as any)?.question_number ?? 0) - ((b.questions as any)?.question_number ?? 0)
  );

  const byTopic = new Map<string, { correct: number; total: number }>();
  items.forEach((r) => {
    const topic = (r.questions as any)?.topic;
    if (!topic) return;
    const cur = byTopic.get(topic) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (r.is_correct) cur.correct += 1;
    byTopic.set(topic, cur);
  });

  const topics = [...byTopic.entries()]
    .map(([topic, v]) => ({ topic, ...v, pct: Math.round((v.correct / v.total) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  const paper = attempt.papers as any;

  return (
    <AppShell>
      <TopBar
        tabs={[
          { href: "/results", label: "My results" },
          { href: "/dashboard", label: "Dashboard" },
          { href: `/subjects/${paper?.subject}`, label: "More papers" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="flex flex-col justify-center text-center">
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>
            {paper?.title}
          </p>
          <p className="num mt-3 text-[56px] font-semibold leading-none" style={{ color: "var(--brand)" }}>
            {attempt.percentage}%
          </p>
          <p className="num mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
            {attempt.score} out of {paper?.total_questions}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2 border-t pt-5" style={{ borderColor: "var(--hairline)" }}>
            <div>
              <p className="num text-[19px] font-semibold" style={{ color: "var(--ok)" }}>
                {attempt.correct_count}
              </p>
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>Correct</p>
            </div>
            <div>
              <p className="num text-[19px] font-semibold" style={{ color: "var(--bad)" }}>
                {attempt.wrong_count}
              </p>
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>Wrong</p>
            </div>
            <div>
              <p className="num text-[19px] font-semibold">{attempt.unanswered_count}</p>
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>Skipped</p>
            </div>
          </div>

          <p className="num mt-4 text-[13px]" style={{ color: "var(--muted)" }}>
            Finished in {clock(attempt.time_taken_seconds ?? 0)}
          </p>
        </Card>

        <Card>
          <CardHead title="Where the marks went" />
          {topics.length ? (
            <div className="flex flex-col gap-3.5">
              {topics.map((t) => (
                <div key={t.topic}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <p className="text-[14px]">{t.topic}</p>
                    <p className="num text-[13px]" style={{ color: "var(--muted)" }}>
                      {t.correct}/{t.total} · {t.pct}%
                    </p>
                  </div>
                  <div className="bar">
                    <span
                      style={{
                        width: `${t.pct}%`,
                        background: t.pct >= 75 ? "var(--ok)" : t.pct >= 50 ? "var(--brand)" : "var(--warn)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px]" style={{ color: "var(--muted)" }}>
              This paper has no topics tagged yet, so there is no breakdown to show.
            </p>
          )}
        </Card>
      </div>

      {/* ---- question by question ---- */}
      <Card className="mt-4">
        <CardHead title="Every question" />
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {items.map((r) => {
            const q = r.questions as any;
            const skipped = !r.selected_answer;
            return (
              <a
                key={q.id}
                href={`#q${q.question_number}`}
                className="num grid h-10 place-items-center rounded-[12px] text-[13px] font-medium"
                style={{
                  background: skipped
                    ? "var(--hairline)"
                    : r.is_correct
                      ? "rgba(46,212,122,.14)"
                      : "rgba(240,71,108,.12)",
                  color: skipped ? "var(--muted)" : r.is_correct ? "var(--ok)" : "var(--bad)",
                }}
              >
                {q.question_number}
              </a>
            );
          })}
        </div>
      </Card>

      <div className="mt-4 flex flex-col gap-4">
        {items
          .filter((r) => !r.is_correct)
          .map((r) => {
            const q = r.questions as any;
            return (
              <Card key={q.id} className="scroll-mt-6" pad={false}>
                <div id={`q${q.question_number}`} className="card-pad">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="chip num">Question {q.question_number}</span>
                    {q.topic && (
                      <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                        {q.topic}
                      </span>
                    )}
                  </div>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={q.question_image_url}
                    alt={`Question ${q.question_number}`}
                    className="w-full rounded-[14px]"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className="chip"
                      style={{ background: "rgba(240,71,108,.1)", color: "var(--bad)" }}
                    >
                      <CrossIcon size={13} /> You chose {r.selected_answer ?? "nothing"}
                    </span>
                    <span
                      className="chip"
                      style={{ background: "rgba(46,212,122,.12)", color: "var(--ok)" }}
                    >
                      <CheckIcon size={13} /> Answer is {q.correct_answer}
                    </span>
                  </div>

                  {(q.review_text || q.review_image_url) && (
                    <div className="mt-4 rounded-[16px] p-4" style={{ background: "var(--brand-soft)" }}>
                      {q.review_text && (
                        <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{q.review_text}</p>
                      )}
                      {q.review_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={q.review_image_url}
                          alt="Worked answer"
                          className="mt-3 w-full rounded-[12px]"
                        />
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/subjects/${paper?.subject}`} className="pill pill-brand">
          Sit another paper
        </Link>
        <Link href="/leaderboard" className="pill pill-ghost">
          See the leaderboard
        </Link>
      </div>

      <div className="mt-4">
        <AdSlot placement="RESULT_BOTTOM" />
      </div>
    </AppShell>
  );
}
