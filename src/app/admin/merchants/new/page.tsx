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
  if (!name) return { ok: false, field: "name", message: "Name is required." };
  if (!slug) return { ok: false, field: "slug", message: "Slug is required." };
  if (Number.isNaN(lat)) return { ok: false, field: "lat", message: "Latitude is required." };
  if (Number.isNaN(lng)) return { ok: false, field: "lng", message: "Longitude is required." };

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

  // Optional: link an owner by email — now using admin_user_inspect
  if (ownerEmail) {
    const { data: inspect, error: rpcErr } = await supabase
      .rpc("admin_user_inspect", { p_email: ownerEmail });

    // The RPC might return a single row or an array; normalize:
    const row = Array.isArray(inspect) ? inspect?.[0] : inspect;
    const ownerId = (row as { user_id?: string } | null | undefined)?.user_id;

    if (!rpcErr && ownerId) {
      await supabase
        .from("merchant_users")
        .insert({ merchant_id: ins.id, user_id: ownerId, role: "owner" })
        .select("merchant_id")
        .maybeSingle();
    }
    // If owner isn’t found, just continue without linking
  }

  return { ok: true, slug: ins.slug, message: "Merchant created!" };
}

export default async function NewMerchantPage() {
  await requireAdmin(); // SSR gate

  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-4">Add Merchant</h1>
      {/* Client form handles toasts + inline errors */}
      <NewMerchantForm action={createMerchantAction} />
    </div>
  );
}
