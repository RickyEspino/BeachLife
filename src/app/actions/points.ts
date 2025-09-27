// src/app/actions/points.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function awardPoints(
  type: string,
  points: number,
  metadata: Record<string, unknown> = {}
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("point_events").insert({
    user_id: user.id,
    type,
    points,
    metadata,
  });
  if (error) throw error;

  revalidatePath("/me");
  return { ok: true as const };
}

export async function awardPointsOnce(
  type: string,
  points: number,
  metadata: Record<string, unknown> = {}
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: existing, error: checkErr } = await supabase
    .from("point_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", type)
    .maybeSingle();

  if (checkErr) throw checkErr;

  if (!existing) {
    const { error } = await supabase.from("point_events").insert({
      user_id: user.id,
      type,
      points,
      metadata,
    });
    if (error) throw error;
  }

  revalidatePath("/me");
  return { ok: true as const, alreadyAwarded: !!existing };
}

export async function awardPointsOncePerDay(
  type: string,
  points: number,
  metadata: Record<string, unknown> = {}
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const now = new Date();
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startUtcIso = startUtc.toISOString();

  const { data: existingToday, error: checkErr } = await supabase
    .from("point_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", type)
    .gte("created_at", startUtcIso)
    .limit(1)
    .maybeSingle();

  if (checkErr) throw checkErr;

  if (!existingToday) {
    const { error } = await supabase.from("point_events").insert({
      user_id: user.id,
      type,
      points,
      metadata: { ...metadata, awarded_at_utc: new Date().toISOString() },
    });
    if (error) throw error;
  }

  revalidatePath("/me");
  return { ok: true as const, alreadyAwardedToday: !!existingToday };
}
