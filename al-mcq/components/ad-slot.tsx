import { createClient } from "@/lib/supabase/server";
import HouseAd from "./house-ad";
import AdUnit from "./ad-unit";

const SLOT_SETTING: Record<string, string> = {
  DASHBOARD_PROMO: "adsense_slot_dashboard",
  PAPER_TOP: "adsense_slot_paper_top",
  RESULT_BOTTOM: "adsense_slot_result",
  SIDEBAR: "adsense_slot_sidebar",
};

/**
 * Directly sold ads win, because you are paid a fixed rate for them.
 * AdSense fills whatever is left over.
 */
export default async function AdSlot({
  placement,
  minHeight = 280,
}: {
  placement: string;
  minHeight?: number;
}) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: ad } = await supabase
    .from("advertisements")
    .select("id, title, image_url, link_url")
    .eq("placement", placement)
    .eq("is_active", true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ad) {
    return (
      <HouseAd
        id={ad.id}
        title={ad.title}
        imageUrl={ad.image_url}
        linkUrl={ad.link_url}
        placement={placement}
      />
    );
  }

  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["adsense_enabled", SLOT_SETTING[placement] ?? "adsense_enabled"]);

  const enabled = settings?.find((s) => s.key === "adsense_enabled")?.value !== false;
  const slot = settings?.find((s) => s.key === SLOT_SETTING[placement])?.value as string | undefined;

  if (!enabled || !slot) return null;
  return <AdUnit slot={slot} minHeight={minHeight} />;
}
