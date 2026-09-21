/**
 * The exam route deliberately renders no ad tag at all. Beyond the effect on
 * completion rates, AdSense counts an ad on a page with a running timer as a
 * poor placement, and accidental clicks there are the kind that get accounts
 * flagged.
 */
export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
