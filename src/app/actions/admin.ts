// src/app/actions/admin.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

/** Gate: ensure the caller is an admin */
async function assertAdmin() {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
}

/** Invite a user by email (sends Supabase invite email). Optionally seed a profile username. */
export async function inviteUserAction(formData: FormData) {
  await assertAdmin();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const username = String(formData.get("username") || "").trim();

  if (!email) throw new Error("Email is required.");

  const admin = createSupabaseAdminClient();

  // Send invite (Supabase will create the auth row)
  // Note: You can switch to admin.createUser(...) if you prefer.
  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteErr) throw inviteErr;

  // Seed a profiles row (upsert) with optional username
  if (invite?.user?.id) {
    const sb = createSupabaseServerClient();
    await sb.from("profiles").upsert({
      id: invite.user.id,
      email,
      username: username || null,
    }, { onConflict: "id" });
  }

  revalidatePath("/admin");
}

/** Hard delete a user (auth + their rows). */
export async function deleteUserAction(formData: FormData) {
  await assertAdmin();

  const userId = String(formData.get("user_id") || "");
  if (!userId) throw new Error("user_id is required.");

  // Optional: clean app tables first (if you don't rely on FK ON DELETE CASCADE)
  const sb = createSupabaseServerClient();
  await sb.from("point_events").delete().eq("user_id", userId);
  await sb.from("profiles").delete().eq("id", userId);

  // Delete from auth (requires service key)
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;

  revalidatePath("/admin");
}
