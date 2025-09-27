// components/AppShell.tsx
'use client';
import type { ReactNode } from 'react';
import BottomTabs from '@/components/BottomTabs';


export default function AppShell({ children }: { children: ReactNode }) {
return (
<div className="grid min-h-[100svh] grid-rows-[1fr_auto] bg-white">
<main className="px-4 pb-[calc(64px+var(--safe-bottom))] pt-[calc(8px+var(--safe-top))]">
{children}
</main>
<footer className="sticky bottom-0 left-0 right-0 z-50 border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60" style={{ paddingBottom: 'calc(8px + var(--safe-bottom))' }}>
<BottomTabs />
</footer>
</div>
);
}
