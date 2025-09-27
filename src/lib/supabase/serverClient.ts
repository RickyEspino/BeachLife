// src/lib/supabase/serverClient.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const createSupabaseServerClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all cookies Supabase may need
        getAll() {
          // Next.js cookies().getAll() => { name, value }[]
          return cookieStore.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },
        // Set (or update) cookies Supabase asks to write
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Next.js accepts (name, value, options)
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
};
