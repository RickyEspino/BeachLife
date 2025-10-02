// src/lib/nav.ts
import type { ComponentType, SVGProps } from "react";
import { Waves, MapPinned, PlaySquare, MessageCircle, UserRound, Store } from "lucide-react";

export type Tab = {
  href: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  matchPrefix?: string;
};

export const TABS: Tab[] = [
  { href: "/now",       label: "Now",       icon: Waves,        matchPrefix: "/now" },      // live beach conditions
  { href: "/map",       label: "Map",       icon: MapPinned,    matchPrefix: "/map" },      // map & merchants
  { href: "/reels",     label: "Reels",     icon: PlaySquare,   matchPrefix: "/reels" },    // short videos
  { href: "/community", label: "Chat",      icon: MessageCircle,matchPrefix: "/community" },// rename for concise feel
  { href: "/merchants", label: "Shops",     icon: Store,        matchPrefix: "/merchants" },// more user-friendly wording
  { href: "/me",        label: "Profile",   icon: UserRound,    matchPrefix: "/me" },       // clearer than 'Me'
];
