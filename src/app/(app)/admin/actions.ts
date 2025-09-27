// src/app/(app)/admin/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";

export async function createUserAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) throw new Error("Email is required");

  const supa = createSupabaseServiceClient();
  const { data, error } = await supa.auth.admin.createUser({
    email,
    email_confirm: true, // send magic link later if you prefer
  });
  if (error) throw error;

  revalidatePath("/admin");
  return { ok: true, user: data.user };
}

export async function deleteUserAction(formData: FormData) {
  const userId = String(formData.get("user_id") || "");
  if (!userId) throw new Error("user_id is required");

  const supa = createSupabaseServiceClient();
  const { error } = await supa.auth.admin.deleteUser(userId);
  if (error) throw error;

  revalidatePath("/admin");
  return { ok: true };
}
