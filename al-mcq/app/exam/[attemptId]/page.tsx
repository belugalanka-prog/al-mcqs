import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import ExamRunner from "./runner";
import type { Choice } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { user } = await requireUser();
  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("attempts")
    .select("id, user_id, paper_id, mode, expires_at, completed_at, papers(title)")
    .eq("id", attemptId)
    .single();

  if (!attempt || attempt.user_id !== user.id) notFound();
  if (attempt.completed_at) redirect(`/results/${attemptId}`);

  // The service-role client can see correct_answer, so the select list here
  // is the security boundary: these four columns are all the browser gets.
  const { data: questions } = await admin
    .from("questions")
    .select("id, question_number, question_image_url, topic")
    .eq("paper_id", attempt.paper_id)
    .order("question_number");

  if (!questions?.length) notFound();

  const { data: saved } = await admin
    .from("attempt_answers")
    .select("question_id, selected_answer")
    .eq("attempt_id", attemptId);

  const initialAnswers: Record<string, Choice> = {};
  saved?.forEach((row) => {
    if (row.selected_answer) initialAnswers[row.question_id] = row.selected_answer as Choice;
  });

  return (
    <ExamRunner
      attemptId={attemptId}
      paperTitle={(attempt.papers as any)?.title ?? "Paper"}
      mode={attempt.mode as "exam" | "practice"}
      expiresAt={attempt.expires_at}
      questions={questions}
      initialAnswers={initialAnswers}
    />
  );
}
