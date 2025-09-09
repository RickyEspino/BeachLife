// src/app/admin/merchants/new/page.tsx
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Ensure the current user is an admin, return a server supabase client */
async function requireAdmin() {
  const supabase = createServerClientSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof || prof.role !== "admin") redirect("/"); // or render a 403 page
  return supabase;
}

export default async function NewMerchantPage() {
  // SSR admin gate for initial render
  await requireAdmin();

  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-4">Add Merchant</h1>

      <form action={createMerchant} className="grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm">Name</label>
          <input
            name="name"
            className="rounded-xl bg-transparent border border-white/10 p-3"
            required
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Slug</label>
          <input
            name="slug"
            className="rounded-xl bg-transparent border border-white/10 p-3"
            placeholder="lowercase-dashes"
            required
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Category</label>
          <select
            name="category"
            className="rounded-xl bg-transparent border border-white/10 p-3"
            defaultValue="other"
          >
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
            <input
              name="lat"
              type="number"
              step="any"
              className="w-full rounded-xl bg-transparent border border-white/10 p-3"
              required
            />
          </div>
          <div>
            <label className="text-sm">Longitude</label>
            <input
              name="lng"
              type="number"
              step="any"
              className="w-full rounded-xl bg-transparent border border-white/10 p-3"
              required
            />
          </div>
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Points per scan</label>
          <input
            name="points_per_scan"
            type="number"
            defaultValue={50}
            className="rounded-xl bg-transparent border border-white/10 p-3"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Owner Email (optional)</label>
          <input
            name="owner_email"
            type="email"
            placeholder="merchant-owner@example.com"
            className="rounded-xl bg-transparent border border-white/10 p-3"
          />
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

/** Server action: create merchant, optionally link owner by email via admin-only RPC */
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
  const ownerEmailRaw = String(formData.get("owner_email") || "").trim();
  const ownerEmail = ownerEmailRaw ? ownerEmailRaw.toLowerCase() : "";

  // Basic validation
  if (!name || !slug || Number.isNaN(lat) || Number.isNaN(lng)) {
    // Could render an error; for now just bounce back
    redirect("/admin/merchants/new");
  }

  // Ensure slug unique (fast path)
  const { data: exists } = await supabase
    .from("merchants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (exists) {
    // If already exists, go to its page
    redirect(`/merchants/${slug}`);
  }

  // Insert the merchant
  const { data: ins, error } = await supabase
    .from("merchants")
    .insert({ name, slug, category, lat, lng, active, points_per_scan })
    .select("id, slug")
    .maybeSingle();

  if (!ins || error) {
    // Fail softly; could also use toasts later
    redirect("/admin/merchants/new");
  }

  // Optional: link an owner by email (admin-only RPC; no direct auth.users read)
  if (ownerEmail) {
    const { data: ownerId, error: ownerErr } = await supabase
      .rpc("get_user_id_by_email_admin", { p_email: ownerEmail });

    if (!ownerErr && ownerId) {
      await supabase
        .from("merchant_users")
        .insert({ merchant_id: ins.id, user_id: ownerId, role: "owner" })
        .select("merchant_id")
        .maybeSingle();
    }
  }

  // Done → go to merchant detail
  redirect(`/merchants/${ins.slug}`);
}
