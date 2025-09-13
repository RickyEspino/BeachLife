// src/app/admin/merchants/[id]/edit/page.tsx
import { redirect, notFound } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Gate: only allow admins */
async function requireAdmin() {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof || prof.role !== "admin") redirect("/");
  return supabase;
}

/** ------- Server actions (same file for convenience) ------- **/

export async function updateMerchantAction(formData: FormData) {
  "use server";

  const supabase = await requireAdmin();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const active = !!formData.get("active");
  const points_per_scan = Number(formData.get("points_per_scan") || 50);
  const offer = (String(formData.get("offer") || "").trim() || null) as string | null;
  const how_to_earn = (String(formData.get("how_to_earn") || "").trim() || null) as
    | string
    | null;

  if (!id || !name || !slug) {
    redirect(`/admin/merchants/${id}/edit?error=missing`);
  }

  // Ensure slug is unique among *other* rows
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

  redirect(`/admin/merchants/${id}/edit?ok=1`);
}

/** Link a user (by email) to this merchant as owner/staff */
export async function addStaffAction(formData: FormData) {
  "use server";

  const supabase = await requireAdmin();

  const merchant_id = String(formData.get("merchant_id") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = (String(formData.get("role") || "staff") as "owner" | "staff");

  if (!merchant_id || !email) {
    redirect(`/admin/merchants/${merchant_id}/edit?error=missing`);
  }

  // Try to find the user by email (most recent profile wins if dupes)
  const { data: prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .maybeSingle();

  const user_id = prof?.id;
  if (!user_id) {
    redirect(`/admin/merchants/${merchant_id}/edit?error=user_not_found`);
  }

  // Avoid duplicate link
  const { data: already } = await supabase
    .from("merchant_users")
    .select("user_id")
    .eq("merchant_id", merchant_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (!already) {
    const { error } = await supabase
      .from("merchant_users")
      .insert({ merchant_id, user_id, role });

    if (error) {
      redirect(
        `/admin/merchants/${merchant_id}/edit?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  redirect(`/admin/merchants/${merchant_id}/edit?linked=1`);
}

/** Remove a linked user from this merchant */
export async function removeStaffAction(formData: FormData) {
  "use server";

  const supabase = await requireAdmin();

  const merchant_id = String(formData.get("merchant_id") || "");
  const user_id = String(formData.get("user_id") || "");

  if (!merchant_id || !user_id) {
    redirect(`/admin/merchants/${merchant_id}/edit?error=missing`);
  }

  const { error } = await supabase
    .from("merchant_users")
    .delete()
    .eq("merchant_id", merchant_id)
    .eq("user_id", user_id);

  if (error) {
    redirect(
      `/admin/merchants/${merchant_id}/edit?error=${encodeURIComponent(error.message)}`
    );
  }

  redirect(`/admin/merchants/${merchant_id}/edit?removed=1`);
}

/** ------- Page ------- **/

export default async function EditMerchantPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await requireAdmin();

  const { data: m } = await supabase
    .from("merchants")
    .select("id, name, slug, active, points_per_scan, offer, how_to_earn")
    .eq("id", params.id)
    .maybeSingle();

  if (!m) notFound();

  // Current team (join to profiles for display_name/email)
  const { data: team } = await supabase
    .from("merchant_users")
    .select(
      `
      user_id,
      role,
      profiles:profiles!inner(id, email, display_name)
    `
    )
    .eq("merchant_id", m.id)
    .order("role", { ascending: false }); // owners first, optional

  return (
    <div className="max-w-2xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Edit Merchant</h1>
        <form action={updateMerchantAction} className="grid gap-3">
          <input type="hidden" name="id" value={m.id} />

          <div className="grid gap-1">
            <label className="text-sm">Name</label>
            <input
              name="name"
              defaultValue={m.name}
              className="rounded-xl bg-transparent border border-white/10 p-3"
              required
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm">Slug</label>
            <input
              name="slug"
              defaultValue={m.slug}
              className="rounded-xl bg-transparent border border-white/10 p-3"
              required
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm">Offer (public)</label>
            <input
              name="offer"
              defaultValue={m.offer ?? ""}
              className="rounded-xl bg-transparent border border-white/10 p-3"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm">How to earn (public)</label>
            <textarea
              name="how_to_earn"
              defaultValue={m.how_to_earn ?? ""}
              className="rounded-xl bg-transparent border border-white/10 p-3"
              rows={3}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm">Points per scan</label>
            <input
              name="points_per_scan"
              type="number"
              defaultValue={m.points_per_scan}
              className="rounded-xl bg-transparent border border-white/10 p-3"
            />
          </div>

          <div className="flex items-center gap-2">
            <input id="active" name="active" type="checkbox" defaultChecked={m.active} />
            <label htmlFor="active">Active</label>
          </div>

          <div className="flex gap-2">
            <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">
              Save
            </button>
            <a
              href="/admin"
              className="rounded-xl border border-white/10 px-4 py-2"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>

      {/* Team management */}
      <section className="rounded-2xl border border-white/10 p-4">
        <h2 className="text-xl font-semibold mb-3">Team</h2>

        {!team?.length ? (
          <p className="text-white/70">No users linked yet.</p>
        ) : (
          <ul className="space-y-2">
            {team.map((row) => (
              <li key={row.user_id} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">
                    {row.profiles?.display_name || row.profiles?.email}
                  </div>
                  <div className="text-white/60 text-sm">{row.role}</div>
                </div>

                <form action={removeStaffAction}>
                  <input type="hidden" name="merchant_id" value={m.id} />
                  <input type="hidden" name="user_id" value={row.user_id} />
                  <button className="text-red-400 hover:text-red-300 text-sm">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {/* Add user to team */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <h3 className="font-semibold mb-2">Link a user</h3>
          <form action={addStaffAction} className="grid gap-2">
            <input type="hidden" name="merchant_id" value={m.id} />
            <div className="grid gap-1">
              <label className="text-sm">User email</label>
              <input
                name="email"
                type="email"
                placeholder="user@example.com"
                className="rounded-xl bg-transparent border border-white/10 p-3"
                required
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm">Role</label>
              <select
                name="role"
                defaultValue="staff"
                className="rounded-xl bg-transparent border border-white/10 p-3"
              >
                <option value="owner">owner</option>
                <option value="staff">staff</option>
              </select>
            </div>
            <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">
              Link user
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
