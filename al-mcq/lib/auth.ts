import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "student" | "teacher" | "admin";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

export async function requireUser() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return session;
}

export async function requireStaff() {
  const session = await requireUser();
  const role = session.profile?.role as Role | undefined;
  if (role !== "admin" && role !== "teacher") redirect("/dashboard");
  return { ...session, role: role! };
}
