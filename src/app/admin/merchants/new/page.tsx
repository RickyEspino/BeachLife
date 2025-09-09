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
  if (!prof || prof.role !== "admin") redirect("/"); // or show 403
  return supabase;
}

export default async function NewMerchantPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-4">Add Merchant</h1>
      <form action={createMerchant} className="grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm">Name</label>
          <input name="name" className="rounded-xl bg-transparent border border-white/10 p-3" required />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Slug</label>
          <input name="slug" className="rounded-xl bg-transparent border border-white/10 p-3" required />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Category</label>
          <select name="category" className="rounded-xl bg-transparent border border-white/10 p-3">
            <option value="food">food</option>
            <option value="nightlife">nightlife</option>
            <option value="activity">activity</option>
            <option value="shopping">shopping</option>
            <option value="golf">golf</option>
            <option value="events">events</option>
            <option value="other">other</option>
          </select>
        </div>
        <div className="grid gap-1 grid-cols-2">
          <div>
            <label className="text-sm">Latitude</label>
            <input name="lat" type="number" step="any" className="w-full rounded-xl bg-transparent border border-white/10 p-3" required />
          </div>
          <div>
            <label className="text-sm">Longitude</label>
            <input name="lng" type="number" step="any" className="w-full rounded-xl bg-transparent border border-white/10 p-3" required />
          </div>
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Points per scan</label>
          <input name="points_per_scan" type="number" className="rounded-xl bg-transparent border border-white/10 p-3" defaultValue={50} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Owner Email (optional)</label>
          <input name="owner_email" type="email" className="rounded-xl bg-transparent border border-white/10 p-3" placeholder="merchant-owner@example.com" />
        </div>
        <div className="flex items-center gap-2">
          <input id="active" name="active" type="checkbox" defaultChecked />
          <label htmlFor="active">Active</label>
        </div>
        <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold mt-2">
          Create Merchant
        </button>
      </form>
    </div>
  );
}

async function createMerchant(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const category = String(formData.get("category") || "other");
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const points_per_scan = Number(formData.get("points_per_scan") || 50);
  const active = !!formData.get("active");
  const ownerEmail = String(formData.get("owner_email") || "").trim().toLowerCase();

  if (!name || !slug || Number.isNaN(lat) || Number.isNaN(lng)) {
    return;
  }

  // Ensure slug unique
  const { data: exists } = await supabase
    .from("merchants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (exists) {
    // TODO: show a toast; for now, redirect back
    redirect(`/merchants/${slug}`);
  }

  const { data: ins, error } = await supabase
    .from("merchants")
    .insert({
      name, slug, category, lat, lng, active, points_per_scan,
    })
    .select("id, slug")
    .maybeSingle();

  if (!ins || error) {
    redirect("/admin/merchants/new"); // fail softly
  }

  // Optional: link an owner by email
  if (ownerEmail) {
    const { data: u } = await supabase
      .from("auth_users_secure") // if you don't have a view, fallback below
      .select("id, email")
      .eq("email", ownerEmail)
      .maybeSingle();

    // If you don't have a view to auth.users, use RPC or run this instead:
    // const { data: u } = await supabase.rpc("get_user_by_email", { email: ownerEmail }).maybeSingle();

    // If you cannot query auth.users from anon, skip and let you link later via SQL.
    if (u) {
      await supabase
        .from("merchant_users")
        .insert({ merchant_id: ins.id, user_id: u.id, role: "owner" })
        .select("merchant_id")
        .maybeSingle();
    }
  }

  redirect(`/merchants/${ins.slug}`);
}
