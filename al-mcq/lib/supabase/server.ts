import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Request-scoped client that respects Row Level Security. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          try {
            list.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component; middleware refreshes the session
          }
        },
      },
    }
  );
}
