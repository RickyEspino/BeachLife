// src/app/actions/points.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

/**
 * Award points to the current signed-in user.
 * Throws if unauthenticated or insert fails.
 */
export async function awardPoints(
  type: string,
  points: number,
  metadata: Record<string, any> = {}
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
  return { ok: true };
}

/**
 * Award points only once per (user, type).
 * If already awarded, this is a no-op.
 */
export async function awardPointsOnce(
  type: string,
  points: number,
  metadata: Record<string, any> = {}
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
  return { ok: true, alreadyAwarded: !!existing };
}

/**
 * Award points at most once per day (UTC) per (user, type).
 * Example: awardPointsOncePerDay("daily_checkin", 500, {...})
 */
export async function awardPointsOncePerDay(
  type: string,
  points: number,
  metadata: Record<string, any> = {}
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Start of today in UTC
  const now = new Date();
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const startUtcIso = startUtc.toISOString();

  // Has an event of this type already been created today (UTC)?
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
  return { ok: true, alreadyAwardedToday: !!existingToday };
}
