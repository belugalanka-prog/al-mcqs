import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reads earnings from the AdSense Management API v2.
 *
 * Auth is a long-lived refresh token belonging to whoever owns the AdSense
 * account, exchanged for a short access token on each call. Scope is
 * adsense.readonly — this code can read reports and nothing else.
 *
 * Every figure AdSense returns is an estimate until the month is finalised,
 * so treat the numbers here as indicative rather than as what will be paid.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://adsense.googleapis.com/v2";

export type ReportRow = Record<string, string>;

export type Summary = {
  earnings: number;
  pageViews: number;
  impressions: number;
  clicks: number;
  ctr: number;
  rpm: number;
  currency: string;
};

export class AdSenseNotConfigured extends Error {}

function config() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.ADSENSE_REFRESH_TOKEN;
  const account = process.env.ADSENSE_ACCOUNT_ID; // pub-0000000000000000

  if (!clientId || !clientSecret || !refreshToken || !account)
    throw new AdSenseNotConfigured(
      "AdSense reporting is not connected yet. Add GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, ADSENSE_REFRESH_TOKEN and ADSENSE_ACCOUNT_ID in Vercel."
    );

  return { clientId, clientSecret, refreshToken, account };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const { clientId, clientSecret, refreshToken } = config();

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok)
    throw new Error(
      data.error_description ??
        "Google refused the refresh token. It may have been revoked — generate a new one."
    );

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

async function report(params: {
  dateRange?: string;
  startDate?: Date;
  endDate?: Date;
  dimensions?: string[];
  metrics: string[];
  orderBy?: string[];
  limit?: number;
}) {
  const { account } = config();
  const token = await accessToken();

  const qs = new URLSearchParams();
  if (params.dateRange) qs.set("dateRange", params.dateRange);

  if (params.startDate && params.endDate) {
    qs.set("dateRange", "CUSTOM");
    qs.set("startDate.year", String(params.startDate.getFullYear()));
    qs.set("startDate.month", String(params.startDate.getMonth() + 1));
    qs.set("startDate.day", String(params.startDate.getDate()));
    qs.set("endDate.year", String(params.endDate.getFullYear()));
    qs.set("endDate.month", String(params.endDate.getMonth() + 1));
    qs.set("endDate.day", String(params.endDate.getDate()));
  }

  params.dimensions?.forEach((d) => qs.append("dimensions", d));
  params.metrics.forEach((m) => qs.append("metrics", m));
  params.orderBy?.forEach((o) => qs.append("orderBy", o));
  if (params.limit) qs.set("limit", String(params.limit));

  const res = await fetch(`${API}/accounts/${account}/reports:generate?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "AdSense rejected the report request.");

  const headers: string[] = (data.headers ?? []).map((h: any) => h.name);
  const rows: ReportRow[] = (data.rows ?? []).map((row: any) => {
    const out: ReportRow = {};
    row.cells.forEach((cell: any, i: number) => (out[headers[i]] = cell.value));
    return out;
  });

  return {
    rows,
    totals: (data.totals?.cells ?? []).reduce((acc: ReportRow, cell: any, i: number) => {
      acc[headers[i]] = cell.value;
      return acc;
    }, {} as ReportRow),
    currency: data.totalMatchedRows !== undefined ? "USD" : "USD",
  };
}

// --- caching -----------------------------------------------------------
// The AdSense API has a daily quota and takes a second or two to answer, so
// results are parked in Postgres and re-fetched only when stale.
async function cached<T>(key: string, maxAgeMinutes: number, load: () => Promise<T>): Promise<T> {
  const admin = createAdminClient();

  const { data: hit } = await admin
    .from("adsense_snapshots")
    .select("payload, fetched_at")
    .eq("report_key", key)
    .maybeSingle();

  const fresh =
    hit && Date.now() - new Date(hit.fetched_at).getTime() < maxAgeMinutes * 60_000;

  if (fresh) return hit.payload as T;

  try {
    const value = await load();
    await admin
      .from("adsense_snapshots")
      .upsert({ report_key: key, payload: value as any, fetched_at: new Date().toISOString() });
    return value;
  } catch (err) {
    // A stale number beats an error page, so fall back to the old snapshot.
    if (hit) return hit.payload as T;
    throw err;
  }
}

const METRICS = [
  "ESTIMATED_EARNINGS",
  "PAGE_VIEWS",
  "IMPRESSIONS",
  "CLICKS",
  "PAGE_VIEWS_CTR",
  "PAGE_VIEWS_RPM",
];

function toSummary(totals: ReportRow): Summary {
  return {
    earnings: Number(totals.ESTIMATED_EARNINGS ?? 0),
    pageViews: Number(totals.PAGE_VIEWS ?? 0),
    impressions: Number(totals.IMPRESSIONS ?? 0),
    clicks: Number(totals.CLICKS ?? 0),
    ctr: Number(totals.PAGE_VIEWS_CTR ?? 0) * 100,
    rpm: Number(totals.PAGE_VIEWS_RPM ?? 0),
    currency: "USD",
  };
}

/** Headline numbers for today, this week, this month and last month. */
export async function getEarningsSummary() {
  return cached("summary:v1", 20, async () => {
    const [today, week, month, lastMonth] = await Promise.all([
      report({ dateRange: "TODAY", metrics: METRICS }),
      report({ dateRange: "LAST_7_DAYS", metrics: METRICS }),
      report({ dateRange: "MONTH_TO_DATE", metrics: METRICS }),
      report({ dateRange: "LAST_MONTH", metrics: METRICS }),
    ]);

    return {
      today: toSummary(today.totals),
      week: toSummary(week.totals),
      month: toSummary(month.totals),
      lastMonth: toSummary(lastMonth.totals),
    };
  });
}

/** Day-by-day earnings for the chart. */
export async function getDailyEarnings(days = 30) {
  return cached(`daily:${days}:v1`, 60, async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));

    const { rows } = await report({
      startDate: start,
      endDate: end,
      dimensions: ["DATE"],
      metrics: ["ESTIMATED_EARNINGS", "PAGE_VIEWS", "CLICKS"],
    });

    return rows.map((r) => ({
      date: r.DATE,
      earnings: Number(r.ESTIMATED_EARNINGS ?? 0),
      pageViews: Number(r.PAGE_VIEWS ?? 0),
      clicks: Number(r.CLICKS ?? 0),
    }));
  });
}

/** Which ad units are actually earning. */
export async function getUnitBreakdown() {
  return cached("units:28:v1", 120, async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 27);

    const { rows } = await report({
      startDate: start,
      endDate: end,
      dimensions: ["AD_UNIT_NAME"],
      metrics: ["ESTIMATED_EARNINGS", "IMPRESSIONS", "CLICKS", "IMPRESSIONS_CTR"],
      orderBy: ["-ESTIMATED_EARNINGS"],
      limit: 10,
    });

    return rows.map((r) => ({
      unit: r.AD_UNIT_NAME ?? "Unnamed unit",
      earnings: Number(r.ESTIMATED_EARNINGS ?? 0),
      impressions: Number(r.IMPRESSIONS ?? 0),
      clicks: Number(r.CLICKS ?? 0),
      ctr: Number(r.IMPRESSIONS_CTR ?? 0) * 100,
    }));
  });
}

/** Outstanding and paid balances. */
export async function getPayments() {
  return cached("payments:v1", 240, async () => {
    const { account } = config();
    const token = await accessToken();

    const res = await fetch(`${API}/accounts/${account}/payments`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Could not read payments.");

    return (data.payments ?? []).map((p: any) => ({
      amount: p.amount as string,
      date: p.date
        ? `${p.date.year}-${String(p.date.month).padStart(2, "0")}-${String(p.date.day).padStart(2, "0")}`
        : null,
      name: p.name as string,
    }));
  });
}
