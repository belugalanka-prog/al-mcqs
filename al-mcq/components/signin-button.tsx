"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignInButton({
  className = "pill pill-brand",
  label = "Continue with Google",
}: {
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const supabase = createClient();
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${base}/auth/callback` },
    });

    if (error) setBusy(false);
  }

  return (
    <button onClick={signIn} disabled={busy} className={className}>
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
        <path fill="#fff" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3" opacity=".9"/>
        <path fill="#fff" d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22" opacity=".75"/>
        <path fill="#fff" d="M6.4 14a6 6 0 0 1 0-3.8V7.6H3.1a10 10 0 0 0 0 8.9z" opacity=".6"/>
        <path fill="#fff" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.6l3.3 2.6C7.2 7.6 9.4 5.9 12 5.9"/>
      </svg>
      {busy ? "Opening Google…" : label}
    </button>
  );
}
