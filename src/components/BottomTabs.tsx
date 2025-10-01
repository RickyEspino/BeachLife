// src/components/BottomTabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { TABS, type Tab } from "@/lib/nav";

type IconType = string | ComponentType<SVGProps<SVGSVGElement>>;

function Icon({ icon, active }: { icon?: IconType; active: boolean }) {
  if (!icon) return null;
  if (typeof icon === "string") return <span aria-hidden="true">{icon}</span>;
  const LucideIcon = icon;
  return (
    <LucideIcon
      aria-hidden="true"
      width={20}
      height={20}
      strokeWidth={2}
      className={active ? "opacity-100" : "opacity-70"}
    />
  );
}

type BottomTabsProps = {
  tabs?: Tab[];
  className?: string;
};

export default function BottomTabs({ tabs = TABS, className = "" }: BottomTabsProps) {
  const pathname = usePathname();

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-40 ${className}`}
      role="navigation"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-center justify-around gap-2 px-4 py-3">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (Boolean(tab.matchPrefix) && Boolean(pathname?.startsWith(tab.matchPrefix!)));

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className="p-2"
              >
                <Icon icon={tab.icon} active={isActive} />
              </Link>
            </li>
          );
        })}
      </ul>
      <div style={{ height: "var(--safe-bottom)" }} />
    </nav>
  );
}
