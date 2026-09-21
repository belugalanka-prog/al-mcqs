import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Practice mode only: reveal one question's answer, and only after the
 * student has actually recorded a selection for it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { questionId } = await request.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("attempts")
    .select("id, user_id, mode")
    .eq("id", id)
    .single();

  if (!attempt || attempt.user_id !== user.id)
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.mode !== "practice")
    return NextResponse.json({ error: "Not available in exam mode." }, { status: 403 });

  const { data: answer } = await admin
    .from("attempt_answers")
    .select("selected_answer")
    .eq("attempt_id", id)
    .eq("question_id", questionId)
    .maybeSingle();

  if (!answer?.selected_answer)
    return NextResponse.json({ error: "Choose an answer first." }, { status: 400 });

  const { data: q } = await admin
    .from("questions")
    .select("correct_answer, review_text, review_image_url")
    .eq("id", questionId)
    .single();

  return NextResponse.json({
    selected: answer.selected_answer,
    correct: q?.correct_answer,
    isCorrect: answer.selected_answer === q?.correct_answer,
    reviewText: q?.review_text,
    reviewImage: q?.review_image_url,
  });
}
