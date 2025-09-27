"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";

export async function createUserAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "").trim();
  if (!email) throw new Error("Email is required");

  const supa = createSupabaseServiceClient();
  const { error } = await supa.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) {
    // Encode the error message in the URL so the page can render it safely.
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  redirect("/admin?created=1");
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("user_id") || "");
  if (!userId) throw new Error("user_id is required");

  const supa = createSupabaseServiceClient();
  const { error } = await supa.auth.admin.deleteUser(userId);
  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  redirect("/admin?deleted=1");
}
