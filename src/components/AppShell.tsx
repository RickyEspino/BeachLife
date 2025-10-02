// components/AppShell.tsx
'use client';
import type { ReactNode } from 'react';
import BottomTabs from '@/components/BottomTabs';


export default function AppShell({ children }: { children: ReactNode }) {
	return (
		<div className="relative min-h-[100svh] bg-white">
			<main className="px-4 pb-[calc(96px+var(--safe-bottom))] pt-[calc(8px+var(--safe-top))]">
				{children}
			</main>
			{/* Floating pill nav */}
			<BottomTabs />
			<div style={{ height: 'var(--safe-bottom)' }} />
		</div>
	);
}
