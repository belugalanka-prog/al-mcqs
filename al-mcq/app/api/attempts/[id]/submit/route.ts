import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Grade and close the attempt. All comparison happens in Postgres. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("attempts")
    .select("id, user_id, completed_at")
    .eq("id", id)
    .single();

  if (!attempt || attempt.user_id !== user.id)
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.completed_at) return NextResponse.json({ alreadySubmitted: true });

  const { data, error } = await admin.rpc("submit_attempt", { p_attempt_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ result: Array.isArray(data) ? data[0] : data });
}
