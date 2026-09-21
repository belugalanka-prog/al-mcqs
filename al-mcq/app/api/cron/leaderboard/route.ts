import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Weekly roll-over, triggered by the Vercel cron defined in vercel.json. */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  await admin.from("user_statistics").update({ weekly_points: 0 }).gt("weekly_points", -1);

  const today = new Date();
  if (today.getDate() <= 7) {
    await admin.from("user_statistics").update({ monthly_points: 0 }).gt("monthly_points", -1);
  }

  // Recompute all-time ranks.
  const { data: rows } = await admin
    .from("leaderboard_entries")
    .select("id, points")
    .eq("board_type", "all_time")
    .order("points", { ascending: false });

  if (rows) {
    await Promise.all(
      rows.map((row, i) =>
        admin.from("leaderboard_entries").update({ rank: i + 1 }).eq("id", row.id)
      )
    );
  }

  return NextResponse.json({ ok: true, ranked: rows?.length ?? 0 });
}
