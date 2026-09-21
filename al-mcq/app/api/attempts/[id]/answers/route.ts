import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Save one selection. is_correct stays null until submission. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { questionId, selected, timeSpent } = await request.json();
  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("attempts")
    .select("id, user_id, completed_at, expires_at")
    .eq("id", id)
    .single();

  if (!attempt || attempt.user_id !== user.id)
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.completed_at)
    return NextResponse.json({ error: "This paper is already submitted." }, { status: 409 });
  if (new Date(attempt.expires_at).getTime() < Date.now() - 30_000)
    return NextResponse.json({ error: "Time is up." }, { status: 409 });

  const { error } = await admin.from("attempt_answers").upsert(
    {
      attempt_id: id,
      question_id: questionId,
      selected_answer: selected,
      time_spent_seconds: timeSpent ?? null,
    },
    { onConflict: "attempt_id,question_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true });
}
