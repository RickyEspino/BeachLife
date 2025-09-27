// src/app/actions/saveProfile.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function saveProfile({
  username,
  avatar_url,
}: {
  username: string;
  avatar_url: string;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("Not signed in");

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        username,
        avatar_url,
        onboarded: true, // 👈 mark as completed
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) throw error;

  revalidatePath("/me");
  revalidatePath("/now");
}
