import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "@/components/admin-shell";
import { Card, CardHead } from "@/components/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLACEMENTS = [
  { key: "DASHBOARD_PROMO", where: "Dashboard, beside recent attempts" },
  { key: "PAPER_TOP", where: "Above the paper cover, before the paper starts" },
  { key: "RESULT_BOTTOM", where: "Under the results breakdown" },
  { key: "SIDEBAR", where: "Subject browsing pages" },
];

export default async function AdminAds() {
  await requireStaff();
  const admin = createAdminClient();
  const { data: ads } = await admin
    .from("advertisements")
    .select("*")
    .order("priority", { ascending: false });

  return (
    <AdminShell title="Advertising">
      <Card>
        <CardHead title="Where ads appear" />
        <p className="mb-4 text-[13px]" style={{ color: "var(--muted)" }}>
          There is deliberately no placement inside a running paper. Interrupting a timed exam costs
          you more in abandoned attempts than the impression is worth.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLACEMENTS.map((p) => {
            const live = ads?.filter((a) => a.placement === p.key && a.is_active).length ?? 0;
            return (
              <div
                key={p.key}
                className="rounded-[16px] p-4"
                style={{ background: "var(--brand-soft)" }}
              >
                <p className="num text-[13px] font-semibold" style={{ color: "var(--brand)" }}>
                  {p.key}
                </p>
                <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
                  {p.where}
                </p>
                <p className="num mt-2 text-[13px]">{live} running</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-4" pad={false}>
        <div className="card-pad pb-0">
          <CardHead title="All advertisements" />
        </div>
        {ads?.length ? (
          ads.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center gap-4 border-t px-6 py-4"
              style={{ borderColor: "var(--hairline)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.image_url}
                alt=""
                className="h-11 w-20 rounded-[10px] object-cover"
                style={{ border: "1px solid var(--hairline)" }}
              />
              <div className="flex-1">
                <p className="text-[14px] font-medium">{a.title ?? "Untitled"}</p>
                <p className="num text-[12px]" style={{ color: "var(--muted)" }}>
                  {a.placement} · {a.impressions} views · {a.clicks} clicks
                </p>
              </div>
              <span className={`chip ${a.is_active ? "" : "opacity-50"}`}>
                {a.is_active ? "Running" : "Paused"}
              </span>
            </div>
          ))
        ) : (
          <p className="card-pad text-[14px]" style={{ color: "var(--muted)" }}>
            No advertisements yet. Insert rows into the advertisements table, or wire up an upload
            form here when you start selling slots.
          </p>
        )}
      </Card>
    </AdminShell>
  );
}
