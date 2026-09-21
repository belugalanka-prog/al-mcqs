import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import { SearchIcon } from "./icons";

export default function TopBar({
  tabs,
  action,
}: {
  tabs: { href: string; label: string }[];
  action?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center gap-3">
      <nav className="flex items-center gap-1">
        {tabs.map((t, i) => (
          <Link key={t.href} href={t.href} className={`pill ${i === 0 ? "pill-soft" : "pill-ghost"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      <div
        className="hidden h-10 min-w-56 flex-1 items-center gap-2 rounded-full px-4 lg:flex"
        style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
      >
        <SearchIcon size={16} className="opacity-40" />
        <input
          placeholder="Search papers, topics or years"
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: "var(--ink)" }}
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        {action && (
          <Link href={action.href} className="pill pill-deep">
            {action.label}
          </Link>
        )}
      </div>
    </header>
  );
}
