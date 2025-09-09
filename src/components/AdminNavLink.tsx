// src/components/AdminNavLink.tsx
import Link from "next/link";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminNavLink() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof || prof.role !== "admin") return null;

  return (
    <Link href="/admin/merchants/new" className="text-sm hover:underline">
      Admin
    </Link>
  );
}
