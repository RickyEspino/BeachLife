// src/app/admin/merchants/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import AdminMerchantsTable from "./AdminMerchantsTable";

export const dynamic = "force-dynamic";

/** Admin gate reused by actions and page */
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

/** Server action: update one merchant (inline quick-edit) */
export async function updateMerchantAction(_: unknown, formData: FormData) {
  "use server";
  const supabase = await requireAdmin();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const points_per_scan = Number(formData.get("points_per_scan") || 0);
  const active = formData.get("active") === "on";

  if (!id) return { ok: false, message: "Missing merchant id." };
  if (!name) return { ok: false, field: "name", message: "Name is required." };
  if (!slug) return { ok: false, field: "slug", message: "Slug is required." };

  // Ensure slug is unique for *other* merchants
  const { data: other } = await supabase
    .from("merchants")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();
  if (other) return { ok: false, field: "slug", message: "Slug already in use." };

  const { error } = await supabase
    .from("merchants")
    .update({ name, slug, points_per_scan, active })
    .eq("id", id);

  if (error) return { ok: false, message: "Update failed." };
  return { ok: true, message: "Saved." };
}

/** Server action: delete merchant (optional) */
export async function deleteMerchantAction(_: unknown, formData: FormData) {
  "use server";
  const supabase = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, message: "Missing merchant id." };

  const { error } = await supabase.from("merchants").delete().eq("id", id);
  if (error) return { ok: false, message: "Delete failed." };
  return { ok: true, message: "Deleted." };
}

export default async function AdminMerchantsPage() {
  const supabase = await requireAdmin();

  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, name, slug, category, points_per_scan, active")
    .order("updated_at", { ascending: false });

  return (
    <div className="p-6 grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Merchants</h1>
        <Link
          href="/admin/merchants/new"
          className="rounded-xl bg-seafoam px-3 py-2 font-semibold"
        >
          + New
        </Link>
      </div>

      <AdminMerchantsTable
        items={merchants ?? []}
        updateAction={updateMerchantAction}
        deleteAction={deleteMerchantAction}
      />
    </div>
  );
}
