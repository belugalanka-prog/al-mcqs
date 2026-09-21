"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridIcon, BookIcon, ChartIcon, TrophyIcon, ClockIcon, UserIcon } from "./icons";

const items = [
  { href: "/dashboard", label: "Dashboard", Icon: GridIcon },
  { href: "/subjects/physics", label: "Papers", Icon: BookIcon },
  { href: "/results", label: "My results", Icon: ClockIcon },
  { href: "/analytics", label: "Analytics", Icon: ChartIcon },
  { href: "/leaderboard", label: "Leaderboard", Icon: TrophyIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
];

export default function Rail() {
  const path = usePathname();

  return (
    <>
      {/* Desktop: the floating vertical rail from the reference */}
      <nav className="rail fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 p-3 md:flex">
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            aria-label={label}
            className="rail-item"
            data-active={path.startsWith(href.split("/").slice(0, 2).join("/"))}
          >
            <Icon size={20} />
          </Link>
        ))}
      </nav>

      {/* Mobile: same six destinations, docked to the bottom */}
      <nav
        className="rail fixed inset-x-3 bottom-3 z-40 flex justify-between px-3 py-2 md:hidden"
        style={{ borderRadius: 22 }}
      >
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="rail-item"
            data-active={path.startsWith(href.split("/").slice(0, 2).join("/"))}
          >
            <Icon size={19} />
          </Link>
        ))}
      </nav>
    </>
  );
}
