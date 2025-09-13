import { redirect, notFound } from "next/navigation";
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

/* -------------------- SAVE MERCHANT (existing) -------------------- */
async function updateMerchantAction(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const active = !!formData.get("active");
  const points_per_scan = Number(formData.get("points_per_scan") || 50);
  const offer = String(formData.get("offer") || "").trim() || null;
  const how_to_earn = String(formData.get("how_to_earn") || "").trim() || null;

  if (!id || !name || !slug) {
    redirect(`/admin/merchants/${id}/edit`);
  }

  // Ensure slug unique for other records
  const { data: exists } = await supabase
    .from("merchants")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (exists) {
    redirect(`/admin/merchants/${id}/edit?error=slug`);
  }

  await supabase
    .from("merchants")
    .update({ name, slug, active, points_per_scan, offer, how_to_earn })
    .eq("id", id);

  redirect("/admin");
}

/* -------------------- STAFF: add & remove -------------------- */
const USE_RPC = true; // set false to use direct insert instead of RPC

async function addStaffAction(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();

  const merchantId = String(formData.get("merchant_id") || "");
  const email = String(formData.get("email") || "").trim();
  const role = String(formData.get("role") || "staff").trim();

  if (!merchantId || !email) return;

  if (USE_RPC) {
    await supabase.rpc("admin_add_user_to_merchant", {
      p_merchant: merchantId,
      p_email: email,
      p_role: role,
    });
  } else {
    // Resolve user id by email (most recent)
    const { data: u } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (!u?.id) return;

    await supabase
      .from("merchant_users")
      .insert({ merchant_id: merchantId, user_id: u.id, role })
      .select("merchant_id") // force mutation
      .maybeSingle();
  }
}

async function removeStaffAction(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();

  const merchantId = String(formData.get("merchant_id") || "");
  const userId = String(formData.get("user_id") || "");

  if (!merchantId || !userId) return;

  await supabase
    .from("merchant_users")
    .delete()
    .eq("merchant_id", merchantId)
    .eq("user_id", userId);
}

/* -------------------- PAGE -------------------- */
export default async function EditMerchantPage({ params }: { params: { id: string } }) {
  const supabase = await requireAdmin();

  // Merchant
  const { data: m } = await supabase
    .from("merchants")
    .select("id, name, slug, active, points_per_scan, offer, how_to_earn")
    .eq("id", params.id)
    .maybeSingle();

  if (!m) notFound();

  // Members (two-step join to be FK-agnostic)
  const { data: rows } = await supabase
    .from("merchant_users")
    .select("user_id, role, created_at")
    .eq("merchant_id", m.id);

  const userIds = rows?.map(r => r.user_id) ?? [];
  let profiles: Array<{ id: string; display_name: string | null; email: string | null }> = [];

  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);
    profiles = profs ?? [];
  }

  const members = (rows ?? []).map(r => ({
    ...r,
    profile: profiles.find(p => p.id === r.user_id) || null,
  }));

  return (
    <div className="max-w-3xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Edit Merchant</h1>
        <form action={updateMerchantAction} className="grid gap-3">
          <input type="hidden" name="id" value={m.id} />
          <div className="grid gap-1">
            <label className="text-sm">Name</label>
            <input name="name" defaultValue={m.name} className="rounded-xl bg-transparent border border-white/10 p-3" required />
          </div>
          <div className="grid gap-1">
            <label className="text-sm">Slug</label>
            <input name="slug" defaultValue={m.slug} className="rounded-xl bg-transparent border border-white/10 p-3" required />
          </div>
          <div className="grid gap-1">
            <label className="text-sm">Offer (public)</label>
            <input name="offer" defaultValue={m.offer ?? ""} className="rounded-xl bg-transparent border border-white/10 p-3" />
          </div>
          <div className="grid gap-1">
            <label className="text-sm">How to earn (public)</label>
            <textarea name="how_to_earn" defaultValue={m.how_to_earn ?? ""} className="rounded-xl bg-transparent border border-white/10 p-3" rows={3} />
          </div>
          <div className="grid gap-1">
            <label className="text-sm">Points per scan</label>
            <input name="points_per_scan" type="number" defaultValue={m.points_per_scan} className="rounded-xl bg-transparent border border-white/10 p-3" />
          </div>
          <div className="flex items-center gap-2">
            <input id="active" name="active" type="checkbox" defaultChecked={m.active} />
            <label htmlFor="active">Active</label>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">Save</button>
            <a href="/admin" className="rounded-xl border border-white/10 px-4 py-2">Cancel</a>
          </div>
        </form>
      </div>

      {/* ---------------- Manage Staff ---------------- */}
      <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Manage Staff</h2>
        </div>

        {/* Add staff */}
        <form action={addStaffAction} className="flex flex-wrap items-end gap-3 mb-4">
          <input type="hidden" name="merchant_id" value={m.id} />
          <label className="grid">
            <span className="text-xs text-white/60">Email</span>
            <input
              name="email"
              inputMode="email"
              placeholder="user@example.com"
              className="rounded-xl bg-transparent border border-white/10 p-2"
              required
            />
          </label>
          <label className="grid">
            <span className="text-xs text-white/60">Role</span>
            <select
              name="role"
              defaultValue="staff"
              className="rounded-xl bg-transparent border border-white/10 p-2"
            >
              <option value="staff">staff</option>
              <option value="manager">manager</option>
              <option value="owner">owner</option>
            </select>
          </label>
          <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">Add user</button>
        </form>

        {/* Current members */}
        {!members.length ? (
          <div className="text-white/70">No staff linked yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((r) => (
                  <tr key={r.user_id} className="border-b border-white/5 last:border-none">
                    <td className="p-2">{r.profile?.display_name ?? "—"}</td>
                    <td className="p-2">{r.profile?.email ?? "—"}</td>
                    <td className="p-2">{r.role}</td>
                    <td className="p-2">
                      <form action={removeStaffAction}>
                        <input type="hidden" name="merchant_id" value={m.id} />
                        <input type="hidden" name="user_id" value={r.user_id} />
                        <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/5">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
