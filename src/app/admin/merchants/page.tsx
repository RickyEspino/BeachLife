// src/app/admin/merchants/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createServerClientSupabase();

  // 1) Auth
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    console.error("[admin gate] getUser error:", userErr);
  }
  if (!user) {
    redirect("/login");
  }

  // 2) Profile (RLS must allow reading own row)
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();

  if (profErr) {
    // Surface in logs rather than silently redirecting,
    // so we can fix RLS/policies if they break again.
    console.error("[admin gate] profiles select error:", profErr, "user_id:", user!.id);
  }

  if (!prof) {
    // Render a 403-like page to make the issue visible
    // (helps avoid infinite redirect loops when RLS blocks)
    return { supabase, isAdmin: false as const, reason: "No profile row for current user" };
  }

  const isAdmin = prof.role === "admin";
  return { supabase, isAdmin: isAdmin as const, reason: isAdmin ? null : "Not admin" };
}

type Merchant = {
  id: string;
  name: string;
  slug: string;
  category: string;
  active: boolean;
  points_per_scan: number;
  updated_at: string | null;
};

export default async function AdminMerchantsPage() {
  const gate = await requireAdmin();

  if (!gate.isAdmin) {
    // Friendly 403 to avoid confusing redirects
    return (
      <div className="max-w-xl p-6">
        <h1 className="text-2xl font-bold mb-2">Access denied</h1>
        <p className="text-white/70">
          {gate.reason || "You don’t have permission to view this page."}
        </p>
        <p className="mt-4">
          <Link href="/dashboard" className="underline">Go to Dashboard</Link>
        </p>
      </div>
    );
  }

  const { supabase } = gate;

  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("id, name, slug, category, active, points_per_scan, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin list] merchants select error:", error);
  }

  return (
    <div className="max-w-5xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Merchants</h1>
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
        <div className="overflow-x-auto rounded-2xl border border-white/10">
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
              {merchants!.map((m) => (
                <tr key={m.id} className="border-b border-white/5 last:border-none">
                  <td className="p-3">{m.name}</td>
                  <td className="p-3 font-mono">{m.slug}</td>
                  <td className="p-3">{m.category}</td>
                  <td className="p-3">{m.active ? "✅" : "—"}</td>
                  <td className="p-3">{m.points_per_scan}</td>
                  <td className="p-3 text-white/60">
                    {m.updated_at ? new Date(m.updated_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Link className="underline" href={`/merchants/${m.slug}`}>
                        View
                      </Link>
                      {/* your RowActions island here */}
                      {/* <RowActions merchant={{ ... }} /> */}
                    </div>
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
