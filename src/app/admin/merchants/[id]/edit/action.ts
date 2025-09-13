// src/app/admin/merchants/[id]/edit/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!prof || prof.role !== "admin") redirect("/");
  return supabase;
}

export async function addStaffAction(_: unknown, formData: FormData) {
  const supabase = await requireAdmin();

  const merchantId = String(formData.get("merchant_id") || "");
  const emailRaw = String(formData.get("email") || "").trim().toLowerCase();
  const role = (String(formData.get("role") || "staff") as "owner" | "staff");

  if (!merchantId) return { ok: false, message: "Missing merchant id." };
  if (!emailRaw) return { ok: false, field: "email", message: "Email is required." };

  // Prefer RPC if you have it:
  // const { data: inspect } = await supabase.rpc("admin_user_inspect", { p_email: emailRaw });
  // const row = Array.isArray(inspect) ? inspect?.[0] : inspect;
  // const userId = (row as { user_id?: string } | null | undefined)?.user_id;

  // Fallback: lookup in profiles
  const { data: prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", emailRaw)
    .order("created_at", { ascending: false })
    .maybeSingle();

  const userId = prof?.id;
  if (!userId) {
    return { ok: false, field: "email", message: "User not found for that email." };
  }

  // Avoid duplicate links
  const { data: already } = await supabase
    .from("merchant_users")
    .select("user_id")
    .eq("merchant_id", merchantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!already) {
    const { error } = await supabase
      .from("merchant_users")
      .insert({ merchant_id: merchantId, user_id: userId, role });
    if (error) return { ok: false, message: error.message };
  }

  return { ok: true, message: "User linked." };
}

export async function removeStaffAction(_: unknown, formData: FormData) {
  const supabase = await requireAdmin();

  const merchantId = String(formData.get("merchant_id") || "");
  const userId = String(formData.get("user_id") || "");
  if (!merchantId || !userId) return { ok: false, message: "Missing ids." };

  const { error } = await supabase
    .from("merchant_users")
    .delete()
    .eq("merchant_id", merchantId)
    .eq("user_id", userId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Removed." };
}
