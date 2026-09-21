import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import SignInButton from "@/components/signin-button";
import { Card } from "@/components/card";
import ThemeToggle from "@/components/theme-toggle";

export default async function Landing() {
  const session = await getSessionUser();
  if (session) redirect("/dashboard");

  return (
    <div style={{ background: "var(--canvas)" }} className="min-h-screen">
      <div className="mx-auto max-w-[1080px] px-5 py-6">
        <div className="mb-14 flex items-center justify-between">
          <p className="display text-[17px]">A/L Master</p>
          <ThemeToggle />
        </div>

        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_1fr]">
          <div>
            <h1 className="text-[38px] leading-[1.12] md:text-[46px]">
              Sit a real A/L paper.
              <br />
              Find out what to fix.
            </h1>
            <p className="mt-5 max-w-[46ch] text-[15px]" style={{ color: "var(--muted)" }}>
              Physics and Chemistry MCQ papers marked the moment you submit, broken down topic by
              topic so you know where the marks went.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SignInButton />
              <Link href="/subjects/physics" className="pill pill-ghost">
                Browse papers first
              </Link>
            </div>

            <p className="mt-4 text-[13px]" style={{ color: "var(--muted)" }}>
              Sign in to keep your results, streak and topic history.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { t: "Past papers", d: "Every A/L paper, year by year, timed exactly like the real thing." },
              { t: "Topic papers", d: "Mechanics, waves, organic — drill one unit at a time." },
              { t: "Instant marking", d: "Your score and full answer review the second you submit." },
              { t: "Topic breakdown", d: "See which units are costing you marks across every attempt." },
            ].map((f) => (
              <Card key={f.t}>
                <p className="text-[15px] font-medium">{f.t}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  {f.d}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
