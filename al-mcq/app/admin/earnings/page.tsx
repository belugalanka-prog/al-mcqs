import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "@/components/admin-shell";
import { Card, CardHead } from "@/components/card";
import EarningsChart from "./earnings-chart";
import {
  getEarningsSummary,
  getDailyEarnings,
  getUnitBreakdown,
  getPayments,
  AdSenseNotConfigured,
} from "@/lib/adsense";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default async function EarningsPage() {
  await requireStaff();

  let summary: Awaited<ReturnType<typeof getEarningsSummary>> | null = null;
  let daily: Awaited<ReturnType<typeof getDailyEarnings>> = [];
  let units: Awaited<ReturnType<typeof getUnitBreakdown>> = [];
  let payments: any[] = [];
  let problem: string | null = null;
  let unconfigured = false;

  try {
    [summary, daily, units, payments] = await Promise.all([
      getEarningsSummary(),
      getDailyEarnings(30),
      getUnitBreakdown(),
      getPayments(),
    ]);
  } catch (err: any) {
    problem = err.message;
    unconfigured = err instanceof AdSenseNotConfigured;
  }

  // House ads are tracked by this app, not by Google, so they load either way.
  const admin = createAdminClient();
  const { data: house } = await admin
    .from("house_ad_performance")
    .select("*")
    .order("impressions", { ascending: false });

  const monthChange =
    summary && summary.lastMonth.earnings > 0
      ? ((summary.month.earnings - summary.lastMonth.earnings) / summary.lastMonth.earnings) * 100
      : null;

  return (
    <AdminShell title="Earnings">
      {problem && (
        <Card className="mb-4">
          <p className="text-[15px] font-medium" style={{ color: unconfigured ? "var(--ink)" : "var(--bad)" }}>
            {unconfigured ? "AdSense reporting is not connected" : "Could not reach AdSense"}
          </p>
          <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
            {problem}
          </p>
          {unconfigured && (
            <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
              Ads can still serve without this. Connecting it only adds the revenue figures below —
              the setup steps are in the README under &ldquo;Connecting AdSense earnings&rdquo;.
            </p>
          )}
        </Card>
      )}

      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>Today so far</p>
              <p className="num mt-1 text-[30px] font-semibold" style={{ color: "var(--brand)" }}>
                {money(summary.today.earnings)}
              </p>
              <p className="num mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
                {summary.today.pageViews.toLocaleString()} page views
              </p>
            </Card>

            <Card>
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>Last 7 days</p>
              <p className="num mt-1 text-[30px] font-semibold">{money(summary.week.earnings)}</p>
              <p className="num mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
                {money(summary.week.rpm)} per 1,000 views
              </p>
            </Card>

            <Card>
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>This month</p>
              <p className="num mt-1 text-[30px] font-semibold">{money(summary.month.earnings)}</p>
              {monthChange !== null && (
                <p
                  className="num mt-1 text-[12px]"
                  style={{ color: monthChange >= 0 ? "var(--ok)" : "var(--bad)" }}
                >
                  {monthChange >= 0 ? "+" : ""}
                  {monthChange.toFixed(0)}% against last month
                </p>
              )}
            </Card>

            <Card>
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>Last month</p>
              <p className="num mt-1 text-[30px] font-semibold">{money(summary.lastMonth.earnings)}</p>
              <p className="num mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
                {summary.lastMonth.clicks.toLocaleString()} clicks
              </p>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHead title="Revenue, day by day" />
            <EarningsChart data={daily} />
            <p className="mt-4 text-[13px]" style={{ color: "var(--muted)" }}>
              Everything on this page is AdSense&rsquo;s own estimate. Figures move until Google
              finalises the month, so the amount actually paid will differ a little.
            </p>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card pad={false}>
              <div className="card-pad pb-0">
                <CardHead title="Which placements earn" />
              </div>
              {units.length ? (
                units.map((u) => (
                  <div
                    key={u.unit}
                    className="flex items-center justify-between gap-4 border-t px-6 py-3.5"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    <div>
                      <p className="text-[14px]">{u.unit}</p>
                      <p className="num text-[12px]" style={{ color: "var(--muted)" }}>
                        {u.impressions.toLocaleString()} impressions · {u.ctr.toFixed(2)}% CTR
                      </p>
                    </div>
                    <p className="num text-[15px] font-semibold">{money(u.earnings)}</p>
                  </div>
                ))
              ) : (
                <p className="card-pad text-[14px]" style={{ color: "var(--muted)" }}>
                  No ad unit data for the last 28 days yet.
                </p>
              )}
            </Card>

            <Card pad={false}>
              <div className="card-pad pb-0">
                <CardHead title="Payments" />
              </div>
              {payments.length ? (
                payments.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-t px-6 py-3.5"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    <p className="num text-[13px]" style={{ color: "var(--muted)" }}>
                      {p.date ?? "Unpaid balance"}
                    </p>
                    <p className="num text-[15px] font-semibold">{p.amount}</p>
                  </div>
                ))
              ) : (
                <p className="card-pad text-[14px]" style={{ color: "var(--muted)" }}>
                  Nothing paid out yet. AdSense holds earnings until the balance passes the
                  threshold for your country, then pays around the 21st of the following month.
                </p>
              )}
            </Card>
          </div>
        </>
      )}

      {/* --- Directly sold ads, counted by this app --- */}
      <Card className="mt-4" pad={false}>
        <div className="card-pad pb-0">
          <CardHead
            title="Ads you sold directly"
            action={
              <Link href="/admin/ads" className="text-[13px]" style={{ color: "var(--brand)" }}>
                Manage
              </Link>
            }
          />
        </div>

        {house?.length ? (
          <>
            <div
              className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 text-[12px] md:grid"
              style={{ color: "var(--muted)", borderBottom: "1px solid var(--hairline)" }}
            >
              <p>Advertisement</p>
              <p>Views</p>
              <p>Clicks</p>
              <p>CTR</p>
              <p>Views this week</p>
            </div>

            {house.map((a: any) => (
              <div
                key={a.id}
                className="grid grid-cols-2 gap-4 border-t px-6 py-3.5 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]"
                style={{ borderColor: "var(--hairline)" }}
              >
                <div>
                  <p className="text-[14px] font-medium">{a.title ?? "Untitled"}</p>
                  <p className="num text-[12px]" style={{ color: "var(--muted)" }}>
                    {a.placement} · {a.is_active ? "running" : "paused"}
                  </p>
                </div>
                <p className="num text-[14px]">{(a.impressions ?? 0).toLocaleString()}</p>
                <p className="num text-[14px]">{a.clicks ?? 0}</p>
                <p className="num text-[14px]">{a.ctr ?? 0}%</p>
                <p className="num text-[14px]">{(a.impressions_7d ?? 0).toLocaleString()}</p>
              </div>
            ))}
          </>
        ) : (
          <p className="card-pad text-[14px]" style={{ color: "var(--muted)" }}>
            You have not sold any ads directly yet. Slots filled this way pay a fixed rate you set,
            and take priority over AdSense wherever both could appear.
          </p>
        )}
      </Card>
    </AdminShell>
  );
}
