"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createQuestions } from "@/app/admin/actions";

/** Files named 001.png … 050.png map to question numbers 1 … 50. */
function numberFromName(name: string): number | null {
  const match = name.match(/(\d+)(?=\.[a-z0-9]+$)/i) ?? name.match(/^(\d+)/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Convert to WebP before upload — a 5 MB screenshot becomes ~400 KB. */
async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not convert image"))),
      "image/webp",
      0.82
    )
  );
}

export default function BulkUpload({
  paperId,
  subject,
  year,
}: {
  paperId: string;
  subject: string;
  year: number | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    const supabase = createClient();
    const list = Array.from(files);
    const usable: { file: File; n: number }[] = [];
    const unnamed: string[] = [];

    list.forEach((f) => {
      const n = numberFromName(f.name);
      if (n === null) unnamed.push(f.name);
      else usable.push({ file: f, n });
    });

    setSkipped(unnamed);
    setError(null);

    if (!usable.length) {
      setError("No file name contained a question number. Rename them 001.png, 002.png and so on.");
      return;
    }

    usable.sort((a, b) => a.n - b.n);
    setProgress({ done: 0, total: usable.length });

    const rows: { question_number: number; question_image_url: string }[] = [];

    for (const [i, item] of usable.entries()) {
      try {
        const webp = await toWebp(item.file);
        const path = `${subject}/${year ?? "misc"}/${paperId}/q${String(item.n).padStart(3, "0")}.webp`;

        const { error: upErr } = await supabase.storage
          .from("questions")
          .upload(path, webp, { contentType: "image/webp", upsert: true });

        if (upErr) throw upErr;

        const { data } = supabase.storage.from("questions").getPublicUrl(path);
        rows.push({ question_number: item.n, question_image_url: data.publicUrl });
      } catch (e: any) {
        setError(`Stopped at ${item.file.name}: ${e.message ?? "upload failed"}`);
        break;
      }
      setProgress({ done: i + 1, total: usable.length });
    }

    if (rows.length) {
      const res = await createQuestions(paperId, rows);
      if (res?.error) setError(res.error);
      else router.refresh();
    }

    setProgress(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        className="grid cursor-pointer place-items-center rounded-[18px] px-6 py-10 text-center"
        style={{ background: "var(--brand-soft)", border: "1px dashed var(--brand)" }}
      >
        <p className="text-[15px] font-medium" style={{ color: "var(--brand)" }}>
          Drop all 50 question images here
        </p>
        <p className="mt-1.5 max-w-[38ch] text-[13px]" style={{ color: "var(--muted)" }}>
          Name them 001.png through 050.png. They are converted to WebP in your browser before
          upload, so large screenshots stay fast to load.
        </p>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {progress && (
        <div className="mt-4">
          <div className="bar">
            <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="num mt-2 text-[13px]" style={{ color: "var(--muted)" }}>
            Uploading {progress.done} of {progress.total}
          </p>
        </div>
      )}

      {skipped.length > 0 && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--warn)" }}>
          Skipped {skipped.length} file{skipped.length === 1 ? "" : "s"} with no number in the name:{" "}
          {skipped.slice(0, 3).join(", ")}
          {skipped.length > 3 ? "…" : ""}
        </p>
      )}

      {error && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
