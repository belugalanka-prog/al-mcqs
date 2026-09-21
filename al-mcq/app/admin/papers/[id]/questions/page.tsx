import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "@/components/admin-shell";
import { Card, CardHead } from "@/components/card";
import BulkUpload from "./bulk-upload";
import AnswerGrid from "./answer-grid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function QuestionManager({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: paper } = await admin.from("papers").select("*").eq("id", id).single();
  if (!paper) notFound();

  const { data: questions } = await admin
    .from("questions")
    .select("id, question_number, question_image_url, correct_answer, topic, review_text, review_image_url")
    .eq("paper_id", id)
    .order("question_number");

  const entered = questions?.length ?? 0;
  const missingReview = questions?.filter((q) => !q.review_text && !q.review_image_url).length ?? 0;

  return (
    <AdminShell
      title={paper.title}
      action={
        <Link href="/admin/papers" className="pill pill-ghost">
          All papers
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.9fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHead title="Upload questions" />
            <BulkUpload paperId={paper.id} subject={paper.subject} year={paper.year} />
          </Card>

          <Card>
            <CardHead title="Progress" />
            <div className="bar">
              <span style={{ width: `${Math.min(100, (entered / paper.total_questions) * 100)}%` }} />
            </div>
            <p className="num mt-3 text-[14px]">
              {entered} of {paper.total_questions} questions uploaded
            </p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
              {missingReview === 0
                ? "Every question has a worked answer."
                : `${missingReview} still have no worked answer. Students can still sit the paper, but they will not see an explanation for those.`}
            </p>
          </Card>
        </div>

        <Card>
          <CardHead title="Answer key" />
          <p className="mb-4 text-[13px]" style={{ color: "var(--muted)" }}>
            Click an option, or press A to E on your keyboard to set the answer and drop to the next
            question. Each row saves on its own.
          </p>

          {questions?.length ? (
            <AnswerGrid paperId={paper.id} rows={questions as any} />
          ) : (
            <p className="text-[14px]" style={{ color: "var(--muted)" }}>
              Nothing uploaded yet. Drop the question images on the left and the key appears here.
            </p>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
