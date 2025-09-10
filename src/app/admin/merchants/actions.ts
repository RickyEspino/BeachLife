"use server";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, authed: false as const, user: null, isAdmin: false as const };
  }
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = !!prof && prof.role === "admin";
  return { supabase, authed: true as const, user, isAdmin };
}

export async function saveMerchant(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const { supabase, authed, isAdmin } = await requireAdmin();
  if (!authed) return { ok: false, message: "Please sign in.", field: undefined };
  if (!isAdmin) return { ok: false, message: "Forbidden.", field: undefined };

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const category = String(formData.get("category") || "other");
  const active = !!formData.get("active");
  const points_per_scan = Number(formData.get("points_per_scan") || 50);

  if (!id) return { ok: false, field: "id", message: "Missing merchant id." };
  if (!name) return { ok: false, field: "name", message: "Name is required." };
  if (!slug) return { ok: false, field: "slug", message: "Slug is required." };
  if (Number.isNaN(points_per_scan)) {
    return { ok: false, field: "points_per_scan", message: "Points must be a number." };
  }

  // Ensure slug unique excluding this record
  const { data: existing } = await supabase
    .from("merchants")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();
  if (existing) {
    return { ok: false, field: "slug", message: "That slug is already taken." };
  }

  const { data, error } = await supabase
    .from("merchants")
    .update({ name, slug, category, active, points_per_scan })
    .eq("id", id)
    .select("id, name, slug, category, active, points_per_scan")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Could not save. Please try again." };
  }

  return { ok: true, data, message: "Saved!" };
}
