"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePublish } from "@/app/admin/actions";

export default function PublishToggle({
  paperId,
  published,
}: {
  paperId: string;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="relative">
      <button
        onClick={() =>
          start(async () => {
            const res = await togglePublish(paperId, !published);
            if (res?.error) setError(res.error);
            else {
              setError(null);
              router.refresh();
            }
          })
        }
        disabled={pending}
        className={`pill ${published ? "pill-soft" : "pill-brand"}`}
      >
        {published ? "Published" : "Publish"}
      </button>

      {error && (
        <p
          className="absolute right-0 top-full z-10 mt-1 w-64 rounded-[12px] p-3 text-[12px]"
          style={{ background: "var(--surface)", border: "1px solid var(--bad)", color: "var(--bad)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
