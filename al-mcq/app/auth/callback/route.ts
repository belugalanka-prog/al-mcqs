import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Vercel gives previews their own origin; prefer the configured site URL in prod.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? origin;

  if (!code) return NextResponse.redirect(`${base}/?error=missing_code`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${base}/?error=auth`);

  // Create the profile row on first sign-in.
  const admin = createAdminClient();
  const meta = data.user.user_metadata ?? {};
  const fullName = (meta.full_name as string) ?? (meta.name as string) ?? "Student";

  await admin.from("profiles").upsert(
    {
      id: data.user.id,
      full_name: fullName,
      display_name: fullName.split(" ")[0],
      avatar_url: (meta.avatar_url as string) ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  await admin
    .from("user_statistics")
    .upsert({ user_id: data.user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  return NextResponse.redirect(`${base}${next}`);
}
