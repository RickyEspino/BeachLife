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
      className={`pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center ${className}`}
      role="navigation"
      aria-label="Primary"
    >
      <div className="pointer-events-auto">
        <ul className="flex items-center gap-1 rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-white/60 px-3 py-2 supports-[backdrop-filter]:bg-white/60">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (Boolean(tab.matchPrefix) && Boolean(pathname?.startsWith(tab.matchPrefix!)));

            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 ${isActive ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'}`}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-blue-600/10 ring-1 ring-inset ring-blue-500/30" aria-hidden="true" />
                  )}
                  <Icon icon={tab.icon} active={isActive} />
                  <span className="sr-only">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
