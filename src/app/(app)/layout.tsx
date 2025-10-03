// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import BottomTabs from "@/components/BottomTabs";
import { headers } from 'next/headers';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const hdrs = await headers();
  let pathname = '';
  try {
    pathname = hdrs.get('x-pathname') || hdrs.get('next-url') || '';
  } catch {
    pathname = '';
  }
  const hideTabs = pathname.startsWith('/onboarding');

  return (
    <div className={`min-h-[100dvh] ${hideTabs ? '' : 'pb-[72px]'}`}>
      {children}
      {!hideTabs && <BottomTabs />}
    </div>
  );
}
