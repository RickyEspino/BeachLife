"use server";

import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

type Merchant = {
  id: string;
  name: string;
  slug: string;
  category: string;
  active: boolean;
  points_per_scan: number;
};

type ActionState =
  | { ok: true; data: Merchant; message?: string }
  | { ok: false; field?: string; message: string };

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

export async function saveMerchant(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const supabase = await requireAdmin();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const category = String(formData.get("category") || "other");
  const points_per_scan = Number(formData.get("points_per_scan") || 50);
  const active = !!formData.get("active");

  if (!id)        return { ok: false, message: "Missing merchant id." };
  if (!name)      return { ok: false, field: "name", message: "Name is required." };
  if (!slug)      return { ok: false, field: "slug", message: "Slug is required." };

  // Optional: ensure slug unique for different row
  const { data: slugRow } = await supabase
    .from("merchants")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();
  if (slugRow) {
    return { ok: false, field: "slug", message: "That slug is already used by another merchant." };
  }

  const { data: updated, error } = await supabase
    .from("merchants")
    .update({ name, slug, category, active, points_per_scan })
    .eq("id", id)
    .select("id, name, slug, category, active, points_per_scan")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, message: "Failed to save. Please try again." };
  }

  return { ok: true, data: updated, message: "Saved!" };
}
