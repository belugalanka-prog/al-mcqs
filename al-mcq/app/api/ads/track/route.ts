import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Impression and click beacons for directly sold ads. */
export async function POST(request: Request) {
  let body: { adId?: string; type?: string; placement?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!body.adId || (body.type !== "impression" && body.type !== "click"))
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const admin = createAdminClient();
  await admin.rpc("track_ad_event", {
    p_ad_id: body.adId,
    p_type: body.type,
    p_placement: body.placement ?? null,
  });

  return new NextResponse(null, { status: 204 });
}
