import Link from "next/link";
import type { ReactNode } from "react";
import ThemeToggle from "./theme-toggle";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/papers", label: "Papers" },
  { href: "/admin/users", label: "Students" },
  { href: "/admin/ads", label: "Advertising" },
  { href: "/admin/earnings", label: "Earnings" },
];

export default function AdminShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <div className="mx-auto max-w-[1280px] px-5 py-6">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <p className="display mr-2 text-[16px]">Admin</p>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="pill pill-ghost">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link href="/dashboard" className="pill pill-ghost">
              Student view
            </Link>
            {action}
          </div>
        </header>

        <h1 className="mb-5 text-[30px]">{title}</h1>
        {children}
      </div>
    </div>
  );
}
