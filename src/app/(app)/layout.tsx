// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import BottomTabs from "@/components/BottomTabs";
import { headers } from 'next/headers';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const hdrs = await headers();
  let pathname = '';
  try {
    pathname = hdrs.get('x-pathname') || hdrs.get('next-url') || '';
  } catch {
    pathname = '';
  }
  const hideTabs = pathname.startsWith('/onboarding');

  // Determine if profile incomplete (username missing) — ignore during onboarding route
  let missingUsername = false;
  if (!hideTabs) {
    try {
      const supabase = createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();
        if (profile && !profile.username) missingUsername = true;
      }
    } catch {
      // swallow
    }
  }

  return (
    <div className={`min-h-[100dvh] ${hideTabs ? '' : 'pb-[72px]'}`}>
      <ProfileCompletionBanner missing={missingUsername} />
      {children}
      {!hideTabs && <BottomTabs />}
    </div>
  );
}
