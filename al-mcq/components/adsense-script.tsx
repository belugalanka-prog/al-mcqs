import Script from "next/script";

/**
 * Loads the AdSense tag once, site-wide. It is deliberately not rendered on
 * the exam route (see app/exam/layout.tsx) — running ads next to a timed
 * question hurts completion rates far more than the impression is worth.
 */
export default function AdSenseScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;

  return (
    <Script
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
