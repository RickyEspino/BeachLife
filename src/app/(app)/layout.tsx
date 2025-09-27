// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import BottomTabs from "@/components/BottomTabs";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] pb-[72px]">
      {children}
      <BottomTabs />
    </div>
  );
}
