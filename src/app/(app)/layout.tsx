// app/(app)/layout.tsx (auth‑gated version)
import type { ReactNode } from 'react';
import AppShell from '@/components/AppShell';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';


export default async function AppLayout({ children }: { children: ReactNode }) {
const cookieStore = await cookies();
const supabase = createServerClient({
supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!, // or anon if you prefer
cookies: {
get(name: string) {
return cookieStore.get(name)?.value;
},
},
});


const { data } = await supabase.auth.getUser();
if (!data.user) redirect('/login');


return <AppShell>{children}</AppShell>;
}