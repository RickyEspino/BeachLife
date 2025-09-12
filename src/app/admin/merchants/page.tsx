// src/app/admin/merchants/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import RowActions from "./RowActions";

export const dynamic = "force-dynamic";

/** Ensure the current session user exists in `profiles` and is an admin. */
async function requireAdmin() {
  const supabase = createServerClientSupabase();

  // 1) Must be signed in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2) Make sure a profiles row exists for THIS user.id (accounts can change UUIDs after resets)
  //    We also store the email for convenience; role stays whatever it already is.
  await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email ?? null })
    .select("id")
    .maybeSingle();

  // 3) Enforce admin role
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof || prof.role !== "admin") redirect("/");

  return supabase;
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
  const supabase = await requireAdmin();

  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, name, slug, category, active, points_per_scan, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

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
              {merchants.map((m) => (
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
                      {/* Client island controls the dialog state */}
                      <RowActions
                        merchant={{
                          id: m.id,
                          name: m.name,
                          slug: m.slug,
                          category: m.category,
                          active: m.active,
                          points_per_scan: m.points_per_scan,
                        }}
                      />
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
