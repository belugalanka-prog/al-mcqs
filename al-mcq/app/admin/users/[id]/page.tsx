import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "@/components/admin-shell";
import { Card, CardHead } from "@/components/card";
import { clock } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The "student 360" view: everything about one student on one page. */
export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: profile }, { data: stats }, { data: attempts }, { data: topics }] =
    await Promise.all([
      admin.from("profiles").select("*").eq("id", id).single(),
      admin.from("user_statistics").select("*").eq("user_id", id).maybeSingle(),
      admin
        .from("attempts")
        .select("id, percentage, score, time_taken_seconds, completed_at, papers(title)")
        .eq("user_id", id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(10),
      admin.from("topic_performance").select("*").eq("user_id", id).order("accuracy"),
    ]);

  if (!profile) notFound();

  const weak = (topics ?? []).slice(0, 5);

  return (
    <AdminShell
      title={profile.full_name ?? "Student"}
      action={
        <Link href="/admin/users" className="pill pill-ghost">
          All students
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        {[
          ["Papers finished", stats?.completed_papers ?? 0],
          ["Accuracy", `${Math.round(Number(stats?.accuracy ?? 0))}%`],
          ["Points", stats?.total_points ?? 0],
          ["Day streak", stats?.current_streak ?? 0],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="num text-[26px] font-semibold">{value as any}</p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
              {label as string}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card pad={false}>
          <div className="card-pad pb-0">
            <CardHead title="Recent papers" />
          </div>
          {attempts?.length ? (
            attempts.map((a: any) => (
              <Link
                key={a.id}
                href={`/admin/attempts/${a.id}`}
                className="flex items-center justify-between border-t px-6 py-3.5"
                style={{ borderColor: "var(--hairline)" }}
              >
                <div>
                  <p className="text-[14px]">{a.papers?.title}</p>
                  <p className="num text-[12px]" style={{ color: "var(--muted)" }}>
                    {new Date(a.completed_at).toLocaleDateString()} · {clock(a.time_taken_seconds ?? 0)}
                  </p>
                </div>
                <p className="num text-[15px] font-semibold">{a.percentage}%</p>
              </Link>
            ))
          ) : (
            <p className="card-pad text-[14px]" style={{ color: "var(--muted)" }}>
              This student has not finished a paper yet.
            </p>
          )}
        </Card>

        <Card>
          <CardHead title="Weakest topics" />
          {weak.length ? (
            <div className="flex flex-col gap-3.5">
              {weak.map((t: any) => (
                <div key={`${t.subject}-${t.topic}`}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <p className="text-[14px]">
                      {t.topic}{" "}
                      <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                        {t.subject}
                      </span>
                    </p>
                    <p className="num text-[13px]" style={{ color: "var(--muted)" }}>
                      {t.correct}/{t.answered}
                    </p>
                  </div>
                  <div className="bar">
                    <span
                      style={{
                        width: `${t.accuracy}%`,
                        background: Number(t.accuracy) < 50 ? "var(--warn)" : "var(--brand)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px]" style={{ color: "var(--muted)" }}>
              No topic data yet. It builds up once tagged questions are answered.
            </p>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
