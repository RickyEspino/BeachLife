// src/lib/supabase/serverClient.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CookieSetOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

export const createSupabaseServerClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieSetOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieSetOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
};
