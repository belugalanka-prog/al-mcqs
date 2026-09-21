"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createPaper(formData: FormData) {
  const { user } = await requireStaff();
  const admin = createAdminClient();

  const { error } = await admin.from("papers").insert({
    title: String(formData.get("title")),
    subject: String(formData.get("subject")),
    year: formData.get("year") ? Number(formData.get("year")) : null,
    paper_type: String(formData.get("paper_type")),
    description: String(formData.get("description") ?? "") || null,
    duration_minutes: Number(formData.get("duration_minutes") ?? 60),
    total_questions: Number(formData.get("total_questions") ?? 50),
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/papers");
  return { ok: true };
}

export async function togglePublish(paperId: string, publish: boolean) {
  await requireStaff();
  const admin = createAdminClient();

  if (publish) {
    // Refuse to publish an incomplete paper, and say exactly what is missing.
    const { data: paper } = await admin
      .from("papers")
      .select("total_questions")
      .eq("id", paperId)
      .single();

    const { count } = await admin
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("paper_id", paperId);

    if ((count ?? 0) < (paper?.total_questions ?? 0))
      return {
        error: `Only ${count ?? 0} of ${paper?.total_questions} questions are in. Add the rest before publishing.`,
      };
  }

  const { error } = await admin.from("papers").update({ is_published: publish }).eq("id", paperId);
  if (error) return { error: error.message };

  revalidatePath("/admin/papers");
  return { ok: true };
}

export async function saveQuestion(
  paperId: string,
  questionNumber: number,
  patch: Record<string, unknown>
) {
  await requireStaff();
  const admin = createAdminClient();

  const { error } = await admin
    .from("questions")
    .update(patch)
    .eq("paper_id", paperId)
    .eq("question_number", questionNumber);

  if (error) return { error: error.message };
  revalidatePath(`/admin/papers/${paperId}/questions`);
  return { ok: true };
}

export async function createQuestions(
  paperId: string,
  rows: { question_number: number; question_image_url: string }[]
) {
  await requireStaff();
  const admin = createAdminClient();

  const { error } = await admin.from("questions").upsert(
    rows.map((r) => ({ ...r, paper_id: paperId, correct_answer: "A" as const })),
    { onConflict: "paper_id,question_number" }
  );

  if (error) return { error: error.message };
  revalidatePath(`/admin/papers/${paperId}/questions`);
  return { ok: true, created: rows.length };
}
