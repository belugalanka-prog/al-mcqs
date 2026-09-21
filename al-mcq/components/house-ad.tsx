"use client";

import { useEffect, useRef } from "react";

/**
 * A directly sold ad — the kind you invoice a tuition class for. Impressions
 * are counted once it is actually on screen, not merely in the DOM, so the
 * numbers you report to an advertiser mean something.
 */
export default function HouseAd({
  id,
  title,
  imageUrl,
  linkUrl,
  placement,
}: {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  placement: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !counted.current) {
          counted.current = true;
          navigator.sendBeacon?.(
            "/api/ads/track",
            new Blob([JSON.stringify({ adId: id, type: "impression", placement })], {
              type: "application/json",
            })
          );
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [id, placement]);

  function onClick() {
    navigator.sendBeacon?.(
      "/api/ads/track",
      new Blob([JSON.stringify({ adId: id, type: "click", placement })], {
        type: "application/json",
      })
    );
  }

  return (
    <a
      ref={ref}
      href={linkUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={onClick}
      className="card block overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={title ?? "Advertisement"} className="h-full w-full object-cover" />
    </a>
  );
}
