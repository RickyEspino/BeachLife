// src/app/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import ProgressRing from "@/components/ProgressRing";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ProfileRow = {
  display_name: string | null;
  email: string | null;
  role: "admin" | "user" | string | null;
};

type MembershipRow = {
  merchant_id: string;
  role: "owner" | "staff" | string;
  merchants: { name: string; slug: string } | null;
};

export default async function Dashboard() {
  const supabase = createServerClientSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/login");

  // Profile for name + admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const name =
    (profile?.display_name ?? "").trim() ||
    (profile?.email ?? user.email ?? "").split("@")[0] ||
    "Friend";

  // Points summary
  const { data: bal } = await supabase
    .from("user_points_balance")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle<{ balance: number }>();

  const points = bal?.balance ?? 0;
  const remaining = Math.max(500 - points, 0);

  // Merchant memberships (owner/staff)
  const { data: memberships } = await supabase
    .from("merchant_users")
    .select(
      `
      merchant_id,
      role,
      merchants!inner (
        name,
        slug
      )
    `
    )
    .eq("user_id", user.id)
    .in("role", ["owner", "staff"])
    .returns<MembershipRow[]>();

  const isAdmin = profile?.role === "admin";
  const isMerchantUser = (memberships?.length ?? 0) > 0;

  return (
    <div className="grid gap-6">
      {/* Greeting + points */}
      <section className="rounded-2xl bg-[var(--card)] shadow-soft p-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-white/60">Welcome back</div>
          <h2 className="text-2xl font-bold">Hey, {name} 🌊</h2>
          <p className="text-white/70 mt-2">
            You’re {remaining} points away from your next reward.
          </p>
        </div>
        <div className="shrink-0">
          <ProgressRing value={points} />
        </div>
      </section>

      {/* Name-only card */}
      <section className="rounded-2xl bg-[var(--card)] shadow-soft p-6">
        <div className="text-sm text-white/60">User</div>
        <div className="mt-1 text-3xl font-bold tracking-tight">{name}</div>
      </section>

      {/* Admin link (admins only) */}
      {isAdmin && (
        <section className="rounded-2xl bg-[var(--card)] shadow-soft p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Admin</div>
              <div className="mt-1 font-semibold">Admin Console</div>
            </div>
            <Link
              href="/admin"
              className="rounded-xl bg-sunset px-4 py-2 font-semibold"
            >
              Open Admin
            </Link>
          </div>
        </section>
      )}

      {/* Merchant link (owner/staff only) */}
      {isMerchantUser && (
        <section className="rounded-2xl bg-[var(--card)] shadow-soft p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Merchants</div>
              <div className="mt-1 font-semibold">Merchant Console</div>
              {/* Optional: show a small list of merchants they belong to */}
              <ul className="mt-2 text-white/80 text-sm list-disc pl-5">
                {(memberships ?? []).slice(0, 4).map((m) => (
                  <li key={`${m.merchant_id}-${m.role}`}>
                    {m.merchants?.name ?? "Merchant"}{" "}
                    <span className="text-white/50">({m.role})</span>
                  </li>
                ))}
                {(memberships?.length ?? 0) > 4 && (
                  <li className="text-white/50">and more…</li>
                )}
              </ul>
            </div>
            <Link
              href="/merchant"
              className="rounded-xl bg-seafoam px-4 py-2 font-semibold"
            >
              Open Console
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
