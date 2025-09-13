// src/app/admin/merchants/new/page.tsx
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import NewMerchantForm from "./NewMerchantForm";

export const dynamic = "force-dynamic";

/** Gate: only allow admins */
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

/** Server action used by the client form */
export async function createMerchantAction(_: unknown, formData: FormData) {
  "use server";

  const supabase = await requireAdmin();

  // Normalize
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const category = String(formData.get("category") || "other");
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const points_per_scan_raw = Number(formData.get("points_per_scan"));
  const points_per_scan = Number.isFinite(points_per_scan_raw) ? Math.max(0, points_per_scan_raw) : 50;
  const active = !!formData.get("active");
  const ownerEmailRaw = String(formData.get("owner_email") || "").trim();
  const ownerEmail = ownerEmailRaw ? ownerEmailRaw.toLowerCase() : "";

  // Basic validation
  if (!name) return { ok: false, field: "name", message: "Name is required." };
  if (!slug) return { ok: false, field: "slug", message: "Slug is required." };
  if (!Number.isFinite(lat)) return { ok: false, field: "lat", message: "Latitude is required." };
  if (!Number.isFinite(lng)) return { ok: false, field: "lng", message: "Longitude is required." };

  // Ensure slug unique
  const { data: exists } = await supabase
    .from("merchants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (exists) {
    return { ok: false, field: "slug", message: "This slug is already in use. Try another." };
  }

  // Create merchant
  const { data: ins, error } = await supabase
    .from("merchants")
    .insert({ name, slug, category, lat, lng, active, points_per_scan })
    .select("id, slug")
    .maybeSingle();

  if (!ins || error) {
    return { ok: false, message: "Could not create merchant. Please try again." };
  }

  // Optionally link an owner by email
  if (ownerEmail) {
    // Preferred: RPC that safely looks up the most-recent auth user for that email
    const { data: inspect, error: rpcErr } = await supabase
      .rpc("admin_user_inspect", { p_email: ownerEmail });

    // If your RPC returns an array, normalize it:
    const row = Array.isArray(inspect) ? inspect?.[0] : inspect;
    const ownerId = (row as { user_id?: string } | null | undefined)?.user_id;

    // Fallback (if you didn't add the RPC) — comment the RPC block above and uncomment below:
    //
    // const { data: prof } = await supabase
    //   .from("profiles")
    //   .select("id")
    //   .eq("email", ownerEmail)
    //   .order("created_at", { ascending: false })
    //   .maybeSingle();
    // const ownerId = prof?.id;

    if (!rpcErr && ownerId) {
      // Avoid duplicate link if already present
      const { data: already } = await supabase
        .from("merchant_users")
        .select("user_id")
        .eq("merchant_id", ins.id)
        .eq("user_id", ownerId)
        .maybeSingle();

      if (!already) {
        await supabase
          .from("merchant_users")
          .insert({ merchant_id: ins.id, user_id: ownerId, role: "owner" })
          .select("merchant_id")
          .maybeSingle();
      }
    }
    // If owner not found, continue without linking.
  }

  return { ok: true, slug: ins.slug, message: "Merchant created!" };
}

export default async function NewMerchantPage() {
  await requireAdmin(); // SSR gate
  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-4">Add Merchant</h1>
      <NewMerchantForm action={createMerchantAction} />
    </div>
  );
}
