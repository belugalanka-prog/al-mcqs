import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Start an attempt. Returns questions WITHOUT correct answers. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to start a paper." }, { status: 401 });

  const { paperId, mode = "exam" } = await request.json();
  const admin = createAdminClient();

  const { data: paper } = await admin
    .from("papers")
    .select("id, duration_minutes, is_published")
    .eq("id", paperId)
    .single();

  if (!paper?.is_published)
    return NextResponse.json({ error: "That paper is not available." }, { status: 404 });

  // Resume an attempt that is still running rather than starting a duplicate.
  const { data: existing } = await admin
    .from("attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("paper_id", paperId)
    .is("completed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existing) return NextResponse.json({ attemptId: existing.id, resumed: true });

  const expires = new Date(Date.now() + paper.duration_minutes * 60_000).toISOString();

  const { data: attempt, error } = await admin
    .from("attempts")
    .insert({ user_id: user.id, paper_id: paperId, mode, expires_at: expires })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attemptId: attempt.id, resumed: false });
}
