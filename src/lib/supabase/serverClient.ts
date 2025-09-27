// src/lib/supabase/serverClient.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const createSupabaseServerClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Next.js 15: cookies() is async — call it inside the method.
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
};
