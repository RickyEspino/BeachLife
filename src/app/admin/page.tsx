// src/app/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof || prof.role !== "admin") redirect("/");
  return supabase;
}

export default async function AdminHome() {
  const supabase = await requireAdmin();

  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, name, slug, category, active, points_per_scan, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-5xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <Link
          href="/admin/merchants/new"
          className="rounded-xl bg-seafoam px-4 py-2 font-semibold"
        >
          + Add Merchant
        </Link>
      </div>

      {!merchants?.length ? (
        <p className="text-white/70">No merchants yet.</p>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[var(--card)] shadow-soft">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Active</th>
                <th className="text-left p-3">Pts/Scan</th>
                <th className="text-left p-3">Updated</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => (
                <tr key={m.id} className="border-b border-white/5 last:border-none">
                  <td className="p-3">{m.name}</td>
                  <td className="p-3 font-mono">{m.slug}</td>
                  <td className="p-3">{m.category}</td>
                  <td className="p-3">{m.active ? "✅" : "—"}</td>
                  <td className="p-3">{m.points_per_scan}</td>
                  <td className="p-3 text-white/60">{new Date(m.updated_at as string).toLocaleString()}</td>
                  <td className="p-3 flex gap-2">
                    <Link className="underline" href={`/merchants/${m.slug}`}>View</Link>
                    <Link className="underline" href={`/admin/merchants/${m.id}/edit`}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
