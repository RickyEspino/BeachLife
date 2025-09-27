// lib/nav.ts
import { Home, Map, PlaySquare, Users, User } from 'lucide-react';


export type Tab = {
label: string;
href: string;
icon: React.ComponentType<{ size?: number; className?: string }>;
};


export const TABS: Tab[] = [
{ label: 'Now', href: '/now', icon: Home },
{ label: 'Map', href: '/map', icon: Map },
{ label: 'Reels', href: '/reels', icon: PlaySquare },
{ label: 'Community', href: '/community', icon: Users },
{ label: 'Me', href: '/me', icon: User },
];