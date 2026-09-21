import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import TopBar from "@/components/topbar";
import { Card } from "@/components/card";
import AdSlot from "@/components/ad-slot";
import { titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

const TYPES = [
  { key: "past", label: "Past papers" },
  { key: "topic", label: "Topic papers" },
  { key: "model", label: "Model papers" },
  { key: "teacher", label: "Teacher papers" },
];

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ subject: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { subject } = await params;
  const { type = "past" } = await searchParams;
  if (!["physics", "chemistry"].includes(subject)) notFound();

  const supabase = await createClient();
  const { data: papers } = await supabase
    .from("papers")
    .select("id, title, year, duration_minutes, total_questions, description")
    .eq("subject", subject)
    .eq("paper_type", type)
    .eq("is_published", true)
    .order("year", { ascending: false });

  return (
    <AppShell>
      <TopBar
        tabs={[
          { href: `/subjects/${subject}`, label: titleCase(subject) },
          { href: "/dashboard", label: "Dashboard" },
          {
            href: `/subjects/${subject === "physics" ? "chemistry" : "physics"}`,
            label: subject === "physics" ? "Chemistry" : "Physics",
          },
        ]}
      />

      <h1 className="text-[32px]">{titleCase(subject)}</h1>
      <p className="mt-2 text-[14px]" style={{ color: "var(--muted)" }}>
        Choose a paper. Exam mode runs the clock and holds the answers until you submit.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <Link
            key={t.key}
            href={`/subjects/${subject}?type=${t.key}`}
            className={`pill ${t.key === type ? "pill-brand" : "pill-ghost"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {papers?.length ? (
          papers.map((p) => (
            <Link key={p.id} href={`/papers/${p.id}`} className="card card-pad">
              {p.year && <span className="chip num">{p.year}</span>}
              <p className="mt-3 text-[16px] font-medium leading-snug">{p.title}</p>
              {p.description && (
                <p className="mt-2 line-clamp-2 text-[13px]" style={{ color: "var(--muted)" }}>
                  {p.description}
                </p>
              )}
              <p className="num mt-4 text-[13px]" style={{ color: "var(--muted)" }}>
                {p.total_questions} questions · {p.duration_minutes} min
              </p>
            </Link>
          ))
        ) : (
          <Card className="sm:col-span-2 lg:col-span-3">
            <p className="text-[14px]" style={{ color: "var(--muted)" }}>
              No {TYPES.find((t) => t.key === type)?.label.toLowerCase()} published for{" "}
              {titleCase(subject)} yet. Check another tab, or come back shortly.
            </p>
          </Card>
        )}
      </div>

      <div className="mt-4">
        <AdSlot placement="SIDEBAR" minHeight={200} />
      </div>
    </AppShell>
  );
}
