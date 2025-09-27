// src/lib/nav.ts
import type { ComponentType, SVGProps } from "react";
import { Home, Map, PlaySquare, Users, User } from "lucide-react";

export type Tab = {
  href: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>; // lucide icon component
  matchPrefix?: string;
};

export const TABS: Tab[] = [
  { href: "/", label: "Home", icon: Home, matchPrefix: "/" },
  { href: "/map", label: "Map", icon: Map, matchPrefix: "/map" },
  { href: "/play", label: "Play", icon: PlaySquare, matchPrefix: "/play" },
  { href: "/friends", label: "Friends", icon: Users, matchPrefix: "/friends" },
  { href: "/me", label: "Me", icon: User, matchPrefix: "/me" },
];
