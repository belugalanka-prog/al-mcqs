"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPaper } from "@/app/admin/actions";

const field = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 14,
  color: "var(--ink)",
  width: "100%",
} as const;

export default function NewPaperForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await createPaper(fd);
          if (res?.error) setError(res.error);
          else {
            setError(null);
            router.refresh();
          }
        })
      }
      className="flex flex-col gap-3"
    >
      <label className="text-[13px]" style={{ color: "var(--muted)" }}>
        Paper title
        <input name="title" required placeholder="2024 A/L Physics MCQ" style={field} className="mt-1.5" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-[13px]" style={{ color: "var(--muted)" }}>
          Subject
          <select name="subject" style={field} className="mt-1.5">
            <option value="physics">Physics</option>
            <option value="chemistry">Chemistry</option>
          </select>
        </label>
        <label className="text-[13px]" style={{ color: "var(--muted)" }}>
          Kind
          <select name="paper_type" style={field} className="mt-1.5">
            <option value="past">Past paper</option>
            <option value="topic">Topic paper</option>
            <option value="model">Model paper</option>
            <option value="teacher">Teacher paper</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-[13px]" style={{ color: "var(--muted)" }}>
          Year
          <input name="year" type="number" defaultValue={new Date().getFullYear()} style={field} className="mt-1.5" />
        </label>
        <label className="text-[13px]" style={{ color: "var(--muted)" }}>
          Questions
          <input name="total_questions" type="number" defaultValue={50} style={field} className="mt-1.5" />
        </label>
        <label className="text-[13px]" style={{ color: "var(--muted)" }}>
          Minutes
          <input name="duration_minutes" type="number" defaultValue={60} style={field} className="mt-1.5" />
        </label>
      </div>

      <label className="text-[13px]" style={{ color: "var(--muted)" }}>
        Description
        <textarea name="description" rows={2} placeholder="Optional note shown on the paper cover" style={field} className="mt-1.5" />
      </label>

      <button type="submit" disabled={pending} className="pill pill-brand mt-1 justify-center">
        {pending ? "Creating…" : "Create paper"}
      </button>

      {error && (
        <p className="text-[13px]" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
