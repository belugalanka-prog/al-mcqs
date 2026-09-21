import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "@/components/admin-shell";
import { Card } from "@/components/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminUsers() {
  await requireStaff();
  const admin = createAdminClient();

  const { data: users } = await admin
    .from("profiles")
    .select("id, full_name, role, created_at, user_statistics(completed_papers, accuracy, total_points, current_streak)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AdminShell title="Students">
      <Card pad={false}>
        <div
          className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 text-[12px] md:grid"
          style={{ color: "var(--muted)", borderBottom: "1px solid var(--hairline)" }}
        >
          <p>Name</p>
          <p>Papers</p>
          <p>Accuracy</p>
          <p>Points</p>
          <p>Streak</p>
        </div>

        {users?.length ? (
          users.map((u: any) => {
            const s = u.user_statistics?.[0] ?? u.user_statistics ?? {};
            return (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="grid grid-cols-2 gap-4 border-t px-6 py-3.5 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]"
                style={{ borderColor: "var(--hairline)" }}
              >
                <div>
                  <p className="text-[14px] font-medium">{u.full_name ?? "Student"}</p>
                  <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                    {u.role}
                  </p>
                </div>
                <p className="num text-[14px]">{s.completed_papers ?? 0}</p>
                <p className="num text-[14px]">{Math.round(Number(s.accuracy ?? 0))}%</p>
                <p className="num text-[14px]">{s.total_points ?? 0}</p>
                <p className="num text-[14px]">{s.current_streak ?? 0}</p>
              </Link>
            );
          })
        ) : (
          <p className="card-pad text-[14px]" style={{ color: "var(--muted)" }}>
            No students have signed in yet.
          </p>
        )}
      </Card>

      <p className="mt-4 text-[13px]" style={{ color: "var(--muted)" }}>
        Email addresses are kept in Supabase Auth and are never shown on the leaderboard or in any
        student-facing view.
      </p>
    </AdminShell>
  );
}
