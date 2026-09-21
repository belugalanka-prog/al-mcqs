import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import TopBar from "@/components/topbar";
import { Card } from "@/components/card";
import { clock } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ResultsIndex() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, percentage, score, correct_count, time_taken_seconds, completed_at, papers(title, subject)")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  return (
    <AppShell>
      <TopBar tabs={[{ href: "/results", label: "My results" }, { href: "/dashboard", label: "Dashboard" }]} />
      <h1 className="text-[32px]">My results</h1>

      <Card className="mt-5" pad={false}>
        {attempts?.length ? (
          <div className="flex flex-col">
            {attempts.map((a) => (
              <Link
                key={a.id}
                href={`/results/${a.id}`}
                className="grid grid-cols-[1.6fr_1fr_auto] items-center gap-4 border-t px-6 py-4 first:border-t-0"
                style={{ borderColor: "var(--hairline)" }}
              >
                <div>
                  <p className="text-[14px] font-medium">{(a.papers as any)?.title}</p>
                  <p className="num mt-0.5 text-[12px]" style={{ color: "var(--muted)" }}>
                    {new Date(a.completed_at!).toLocaleDateString()} · {clock(a.time_taken_seconds ?? 0)}
                  </p>
                </div>
                <div className="bar">
                  <span style={{ width: `${a.percentage ?? 0}%` }} />
                </div>
                <p className="num text-[15px] font-semibold">{a.percentage}%</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="card-pad text-[14px]" style={{ color: "var(--muted)" }}>
            You have not finished a paper yet. Pick one and your history starts here.
          </p>
        )}
      </Card>
    </AppShell>
  );
}
