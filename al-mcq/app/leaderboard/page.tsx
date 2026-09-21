import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import AppShell from "@/components/app-shell";
import TopBar from "@/components/topbar";
import { Card } from "@/components/card";

export const dynamic = "force-dynamic";

const BOARDS = [
  { key: "all_time", label: "All time" },
  { key: "weekly", label: "This week" },
  { key: "monthly", label: "This month" },
  { key: "accuracy", label: "Accuracy" },
];

function periodKey(board: string) {
  const now = new Date();
  if (board === "monthly") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (board === "weekly") {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return "all";
}

/** Names are shown per the admin's privacy setting. Email never appears. */
function publicName(profile: any, mode: string) {
  const full = profile?.full_name ?? "Student";
  if (mode === "full_name") return full;
  if (mode === "display_name") return profile?.display_name ?? full.split(" ")[0];
  const [first, ...rest] = full.split(" ");
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

export default async function Leaderboard({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board = "all_time" } = await searchParams;
  const supabase = await createClient();
  const session = await getSessionUser();

  const { data: settings } = await supabase.from("app_settings").select("key, value");
  const nameMode =
    (settings?.find((s) => s.key === "leaderboard_name_mode")?.value as string) ?? "first_initial";
  const minPapers = Number(settings?.find((s) => s.key === "accuracy_board_min_papers")?.value ?? 5);

  let rows: any[] = [];

  if (board === "accuracy") {
    const { data } = await supabase
      .from("user_statistics")
      .select("user_id, accuracy, completed_papers, total_points, profiles(full_name, display_name, avatar_url, hide_from_leaderboard)")
      .gte("completed_papers", minPapers)
      .order("accuracy", { ascending: false })
      .limit(50);
    rows = (data ?? []).map((r) => ({ ...r, points: r.total_points }));
  } else {
    const { data } = await supabase
      .from("leaderboard_entries")
      .select("user_id, points, accuracy, papers_completed, profiles(full_name, display_name, avatar_url, hide_from_leaderboard)")
      .eq("board_type", board)
      .eq("period_key", periodKey(board))
      .order("points", { ascending: false })
      .limit(50);
    rows = data ?? [];
  }

  rows = rows.filter((r) => !(r.profiles as any)?.hide_from_leaderboard);

  return (
    <AppShell>
      <TopBar
        tabs={[
          { href: "/leaderboard", label: "Leaderboard" },
          { href: "/dashboard", label: "Dashboard" },
        ]}
      />

      <h1 className="text-[32px]">Leaderboard</h1>
      <p className="mt-2 text-[14px]" style={{ color: "var(--muted)" }}>
        Points come from correct answers and completed papers. The accuracy board needs at least{" "}
        {minPapers} finished papers, so volume alone will not carry you up it.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {BOARDS.map((b) => (
          <Link
            key={b.key}
            href={`/leaderboard?board=${b.key}`}
            className={`pill ${b.key === board ? "pill-brand" : "pill-ghost"}`}
          >
            {b.label}
          </Link>
        ))}
      </div>

      <Card className="mt-5" pad={false}>
        {rows.length ? (
          <div className="flex flex-col">
            {rows.map((r, i) => {
              const me = session?.user.id === r.user_id;
              return (
                <div
                  key={r.user_id}
                  className="grid grid-cols-[34px_1fr_auto] items-center gap-4 border-t px-6 py-3.5 first:border-t-0"
                  style={{
                    borderColor: "var(--hairline)",
                    background: me ? "var(--brand-soft)" : undefined,
                  }}
                >
                  <p className="num text-[14px] font-semibold" style={{ color: i < 3 ? "var(--brand)" : "var(--muted)" }}>
                    {i + 1}
                  </p>
                  <p className="text-[14px] font-medium">
                    {publicName(r.profiles, nameMode)}
                    {me && <span className="chip ml-2">You</span>}
                  </p>
                  <p className="num text-[14px] font-semibold">
                    {board === "accuracy" ? `${r.accuracy}%` : `${r.points} pts`}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="card-pad text-[14px]" style={{ color: "var(--muted)" }}>
            Nobody has scored on this board yet. Finish a paper and you will be on it.
          </p>
        )}
      </Card>
    </AppShell>
  );
}
