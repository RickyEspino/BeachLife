// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server-side Supabase client (works with Next 15's async cookies) */
export function createServerClientSupabase() {
  // Defer resolving cookies() until handler execution
  const cookieStorePromise = cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // All three may be async with Next 15
        get: async (name: string) => (await cookieStorePromise).get(name)?.value,
        set: async (name: string, value: string, options: any) => {
          (await cookieStorePromise).set({ name, value, ...options });
        },
        remove: async (name: string, options: any) => {
          (await cookieStorePromise).set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  return client;
}
