import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import AppShell from "@/components/app-shell";
import TopBar from "@/components/topbar";
import { Card } from "@/components/card";
import AdSlot from "@/components/ad-slot";
import StartPaper from "./start-paper";
import SignInButton from "@/components/signin-button";
import { titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PaperCover({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  const supabase = await createClient();
  const session = await getSessionUser();

  const { data: paper } = await supabase
    .from("papers")
    .select("*")
    .eq("id", paperId)
    .eq("is_published", true)
    .single();

  if (!paper) notFound();

  return (
    <AppShell>
      <TopBar
        tabs={[
          { href: `/subjects/${paper.subject}`, label: titleCase(paper.subject) },
          { href: "/dashboard", label: "Dashboard" },
        ]}
      />

      <div className="mb-4">
        <AdSlot placement="PAPER_TOP" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <span className="chip">{titleCase(paper.paper_type)}</span>
          <h1 className="mt-4 text-[30px] leading-tight">{paper.title}</h1>
          {paper.description && (
            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
              {paper.description}
            </p>
          )}

          <h2 className="mt-8 text-[15px]">Before you begin</h2>
          <ul className="mt-3 flex flex-col gap-2.5 text-[14px]" style={{ color: "var(--muted)" }}>
            <li>The clock starts as soon as you open question one and keeps running on the server, so closing the tab will not pause it.</li>
            <li>Every selection saves immediately. If your connection drops, reopen the paper and carry on from where you stopped.</li>
            <li>You can jump between questions freely and change any answer until you submit.</li>
            <li>Marks and worked answers appear only after you submit.</li>
          </ul>
        </Card>

        <Card className="flex flex-col">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="num text-[26px] font-semibold">{paper.total_questions}</p>
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>Questions</p>
            </div>
            <div>
              <p className="num text-[26px] font-semibold">{paper.duration_minutes}</p>
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>Minutes</p>
            </div>
          </div>

          <div className="mt-6">
            {session ? (
              <StartPaper paperId={paper.id} />
            ) : (
              <>
                <SignInButton className="pill pill-brand w-full justify-center" />
                <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
                  Sign in so your result, streak and topic history are saved.
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
