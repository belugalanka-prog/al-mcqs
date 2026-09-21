import type { ReactNode } from "react";
import Rail from "./rail";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "var(--canvas)" }} className="min-h-screen">
      <Rail />
      <main className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 md:pl-24 md:pr-6 md:pb-10">
        {children}
      </main>
    </div>
  );
}
