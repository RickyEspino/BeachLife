// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import BottomTabs from "@/components/BottomTabs";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Build a Supabase server client (if you need it inside the layout)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Use the anon key here. Do NOT use the service role key in a layout.
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Next.js 15: cookies() is async — call it inside each method.
        async getAll() {
          const store = await cookies();
          return store.getAll().map(({ name, value }) => ({ name, value }));
        },
        async setAll(cookiesToSet) {
          const store = await cookies();
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        },
      },
    }
  );

  // If you need user/profile globally, you could fetch it here:
  // const { data: { user } } = await supabase.auth.getUser();
  // const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).maybeSingle();

  return (
    <div className="min-h-[100dvh] pb-[72px]"> {/* bottom padding for tabs */}
      {children}
      <BottomTabs />
    </div>
  );
}
