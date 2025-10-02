// src/lib/nav.ts
import type { ComponentType, SVGProps } from "react";
import { Sun, Map, Film, Users, User, Store } from "lucide-react";

export type Tab = {
  href: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  matchPrefix?: string;
};

export const TABS: Tab[] = [
  { href: "/now",       label: "Now",       icon: Sun,   matchPrefix: "/now" },
  { href: "/map",       label: "Map",       icon: Map,   matchPrefix: "/map" },
  { href: "/reels",     label: "Reels",     icon: Film,  matchPrefix: "/reels" },
  { href: "/community", label: "Community", icon: Users, matchPrefix: "/community" },
  { href: "/merchants", label: "Merchants", icon: Store, matchPrefix: "/merchants" },
  { href: "/me",        label: "Me",        icon: User,  matchPrefix: "/me" },
];
