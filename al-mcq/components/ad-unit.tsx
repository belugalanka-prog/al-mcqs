"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One responsive AdSense unit. Reserves its height before the ad arrives so
 * the page does not jump, and hides itself entirely if AdSense returns
 * nothing (common on low-traffic pages and in some countries).
 */
export default function AdUnit({
  slot,
  format = "auto",
  minHeight = 280,
  label = true,
}: {
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  minHeight?: number;
  label?: boolean;
}) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const ref = useRef<HTMLModElement>(null);
  const [empty, setEmpty] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    if (!client || !slot || pushed.current) return;
    pushed.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // The script is blocked or still loading; nothing useful to do.
    }

    // AdSense marks unfilled units with data-ad-status="unfilled".
    const check = setTimeout(() => {
      if (ref.current?.getAttribute("data-ad-status") === "unfilled") setEmpty(true);
    }, 3000);

    return () => clearTimeout(check);
  }, [client, slot]);

  if (!client || !slot || empty) return null;

  return (
    <div className="card overflow-hidden" style={{ padding: 12 }}>
      {label && (
        <p className="mb-2 text-[11px]" style={{ color: "var(--muted)" }}>
          Advertisement
        </p>
      )}
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block", minHeight }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
