import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "@/components/admin-shell";
import { Card, CardHead } from "@/components/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminHome() {
  await requireStaff();
  const admin = createAdminClient();

  const count = (table: string, filter?: (q: any) => any) => {
    let q = admin.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    return q;
  };

  const [students, papers, questions, attempts, hardest] = await Promise.all([
    count("profiles", (q) => q.eq("role", "student")),
    count("papers"),
    count("questions"),
    count("attempts", (q) => q.not("completed_at", "is", null)),
    admin
      .from("question_difficulty")
      .select("question_number, paper_title, topic, correct_pct, attempts")
      .gte("attempts", 5)
      .order("correct_pct", { ascending: true })
      .limit(8),
  ]);

  const tiles = [
    { label: "Students", value: students.count ?? 0 },
    { label: "Papers", value: papers.count ?? 0 },
    { label: "Questions", value: questions.count ?? 0 },
    { label: "Papers sat", value: attempts.count ?? 0 },
  ];

  return (
    <AdminShell
      title="Overview"
      action={
        <Link href="/admin/papers" className="pill pill-deep">
          New paper
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <p className="num text-[30px] font-semibold">{t.value.toLocaleString()}</p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
              {t.label}
            </p>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHead title="Questions students are getting wrong" />
        <p className="mb-4 text-[13px]" style={{ color: "var(--muted)" }}>
          Ranked by how few students answer correctly, once at least five have tried. A very low
          score often means the concept needs reteaching — or that the answer key is wrong.
        </p>

        {hardest.data?.length ? (
          <div className="flex flex-col">
            {hardest.data.map((q: any, i: number) => (
              <div
                key={i}
                className="grid grid-cols-[60px_1fr_auto] items-center gap-4 border-t py-3 first:border-t-0 first:pt-0"
                style={{ borderColor: "var(--hairline)" }}
              >
                <span className="chip num">Q{q.question_number}</span>
                <div>
                  <p className="text-[14px]">{q.paper_title}</p>
                  <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                    {q.topic ?? "No topic tagged"} · {q.attempts} attempts
                  </p>
                </div>
                <p
                  className="num text-[15px] font-semibold"
                  style={{ color: q.correct_pct < 40 ? "var(--bad)" : "var(--muted)" }}
                >
                  {q.correct_pct ?? 0}%
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>
            Not enough attempts yet. This fills in once students start sitting papers.
          </p>
        )}
      </Card>
    </AdminShell>
  );
}
