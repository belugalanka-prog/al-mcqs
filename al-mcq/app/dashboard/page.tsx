import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import TopBar from "@/components/topbar";
import { Card, CardHead, Stat } from "@/components/card";
import Ring from "@/components/ring";
import AdSlot from "@/components/ad-slot";
import { ArrowIcon, ClockIcon, CheckIcon } from "@/components/icons";
import { clock } from "@/lib/format";

export const dynamic = "force-dynamic";

const TILES = [
  {
    href: "/subjects/physics?type=past",
    title: "Past papers",
    note: "Every A/L paper, timed",
    tint: "#EFEDFD",
  },
  {
    href: "/subjects/physics?type=topic",
    title: "Topic papers",
    note: "Drill one unit at a time",
    tint: "#E7F7EF",
  },
  {
    href: "/subjects/physics?type=model",
    title: "Model papers",
    note: "Written for this year's syllabus",
    tint: "#FFF1E8",
  },
];

export default async function Dashboard() {
  const { user, profile } = await requireUser();
  const supabase = await createClient();

  const [{ data: stats }, { data: attempts }, { data: running }, { data: topics }] =
    await Promise.all([
      supabase.from("user_statistics").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("attempts")
        .select("id, percentage, score, time_taken_seconds, completed_at, papers(title, subject)")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(4),
      supabase
        .from("attempts")
        .select("id, expires_at, papers(title, total_questions)")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle(),
      supabase.from("topic_performance").select("subject, accuracy").eq("user_id", user.id),
    ]);

  const subjectAccuracy = (subject: string) => {
    const rows = (topics ?? []).filter((t) => t.subject === subject);
    if (!rows.length) return 0;
    return rows.reduce((a, r) => a + Number(r.accuracy ?? 0), 0) / rows.length;
  };

  const firstName = profile?.display_name ?? profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <AppShell>
      <TopBar
        tabs={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/subjects/physics", label: "Physics" },
          { href: "/subjects/chemistry", label: "Chemistry" },
        ]}
        action={{ href: "/subjects/physics", label: "Start a paper" }}
      />

      {/* ---- Hero + the three illustration tiles from the reference ---- */}
      <div className="grid gap-4 lg:grid-cols-[1.35fr_2fr]">
        <Card className="flex flex-col justify-center">
          <h1 className="text-[34px] leading-[1.14] md:text-[40px]">
            Hi, {firstName}!
            <br />
            What are you sitting today?
          </h1>
          <p className="mt-4 max-w-[38ch] text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Pick a paper, answer under real time pressure, and get the topic breakdown the moment
            you submit.
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className="card card-pad flex flex-col justify-between">
              <div
                className="mb-6 grid h-20 place-items-center rounded-[16px]"
                style={{ background: t.tint }}
              >
                <span className="display text-[22px]" style={{ color: "var(--brand)" }}>
                  {t.title.split(" ")[0]}
                </span>
              </div>
              <div>
                <p className="text-[15px] font-medium">{t.title}</p>
                <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
                  {t.note}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ---- Resume / streak / assigned row ---- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHead title="Continue where you stopped" />
          {running ? (
            <Link
              href={`/exam/${running.id}`}
              className="flex items-center justify-between rounded-[16px] p-4"
              style={{ background: "var(--brand-soft)" }}
            >
              <div>
                <p className="text-[15px] font-medium">{(running.papers as any)?.title}</p>
                <p className="num mt-1 flex items-center gap-1.5 text-[13px]" style={{ color: "var(--brand)" }}>
                  <ClockIcon size={14} />
                  {clock((new Date(running.expires_at).getTime() - Date.now()) / 1000)} left
                </p>
              </div>
              <span className="pill pill-brand">Resume</span>
            </Link>
          ) : (
            <p className="text-[14px]" style={{ color: "var(--muted)" }}>
              Nothing in progress. Start a paper and it will wait here if you get interrupted.
            </p>
          )}
        </Card>

        <Card>
          <CardHead title="Your run" />
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Papers done" value={stats?.completed_papers ?? 0} />
            <Stat label="Accuracy" value={`${Math.round(Number(stats?.accuracy ?? 0))}%`} />
            <Stat label="Day streak" value={stats?.current_streak ?? 0} tone="var(--warn)" />
          </div>
        </Card>

        <Card>
          <CardHead title="Accuracy by subject" />
          <div className="flex flex-col gap-3">
            <Ring value={subjectAccuracy("physics")} label="Physics" sublabel="across all attempts" />
            <Ring
              value={subjectAccuracy("chemistry")}
              label="Chemistry"
              sublabel="across all attempts"
              color="var(--ok)"
            />
          </div>
        </Card>
      </div>

      {/* ---- Recent attempts + promo + leaderboard ---- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHead
            title="Recent attempts"
            action={
              <Link href="/results" className="text-[13px]" style={{ color: "var(--brand)" }}>
                See all
              </Link>
            }
          />

          {attempts?.length ? (
            <div className="flex flex-col">
              {attempts.map((a) => (
                <Link
                  key={a.id}
                  href={`/results/${a.id}`}
                  className="grid grid-cols-[1.6fr_1fr_0.8fr] items-center gap-4 border-t py-3.5 first:border-t-0 first:pt-0"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <div>
                    <p className="text-[14px] font-medium">{(a.papers as any)?.title}</p>
                    <p className="num mt-0.5 text-[12px]" style={{ color: "var(--muted)" }}>
                      {clock(a.time_taken_seconds ?? 0)} taken
                    </p>
                  </div>
                  <div className="bar">
                    <span style={{ width: `${a.percentage ?? 0}%` }} />
                  </div>
                  <p className="num text-right text-[14px] font-semibold">{a.percentage}%</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[14px]" style={{ color: "var(--muted)" }}>
              No attempts yet. Your first paper will show up here with a full breakdown.
            </p>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <AdSlot placement="DASHBOARD_PROMO" />

          <Card>
            <CardHead title="Leaderboard" />
            <div className="flex items-baseline gap-2">
              <p className="num text-[30px] font-semibold" style={{ color: "var(--brand)" }}>
                {stats?.total_points ?? 0}
              </p>
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                points
              </p>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[13px]" style={{ color: "var(--muted)" }}>
              <CheckIcon size={14} /> {stats?.correct_answers ?? 0} correct answers so far
            </p>
            <Link href="/leaderboard" className="pill pill-soft mt-4 w-full justify-center">
              See the rankings <ArrowIcon size={15} />
            </Link>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
