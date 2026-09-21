import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "@/components/admin-shell";
import { Card, CardHead } from "@/components/card";
import NewPaperForm from "./new-paper-form";
import PublishToggle from "./publish-toggle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPapers() {
  await requireStaff();
  const admin = createAdminClient();

  const { data: papers } = await admin
    .from("papers")
    .select("*, questions(count)")
    .order("created_at", { ascending: false });

  return (
    <AdminShell title="Papers">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        <Card>
          <CardHead title="Create a paper" />
          <NewPaperForm />
        </Card>

        <Card pad={false}>
          <div className="card-pad pb-0">
            <CardHead title="All papers" />
          </div>

          {papers?.length ? (
            <div className="flex flex-col">
              {papers.map((p: any) => {
                const entered = p.questions?.[0]?.count ?? 0;
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 border-t px-6 py-4"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    <div className="min-w-[200px] flex-1">
                      <Link href={`/admin/papers/${p.id}/questions`} className="text-[14px] font-medium">
                        {p.title}
                      </Link>
                      <p className="num mt-0.5 text-[12px]" style={{ color: "var(--muted)" }}>
                        {p.subject} · {p.paper_type} · {entered}/{p.total_questions} questions in
                      </p>
                    </div>

                    <div className="bar w-24">
                      <span style={{ width: `${Math.min(100, (entered / p.total_questions) * 100)}%` }} />
                    </div>

                    <Link href={`/admin/papers/${p.id}/questions`} className="pill pill-ghost">
                      Questions
                    </Link>
                    <PublishToggle paperId={p.id} published={p.is_published} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="card-pad text-[14px]" style={{ color: "var(--muted)" }}>
              No papers yet. Create one on the left, then upload its question images.
            </p>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
