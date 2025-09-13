// src/app/merchant/register/page.tsx
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const POINTS_PER_DOLLAR = 1; // <-- easy to tweak later or fetch per-merchant

async function requireStaffOrOwner() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get all merchants this user can operate
  const { data: memberships } = await supabase
    .from("merchant_users")
    .select("merchant_id, role, merchants(name, id, points_per_scan)")
    .eq("user_id", user.id)
    .in("role", ["owner", "staff"]);

  if (!memberships?.length) {
    // Not staff/owner anywhere
    redirect("/");
  }

  return { supabase, user, memberships };
}

export default async function MerchantRegisterPage() {
  const { supabase, user, memberships } = await requireStaffOrOwner();

  async function createToken(formData: FormData) {
    "use server";

    const merchantId = String(formData.get("merchant_id") || "");
    const amount = Number(formData.get("amount") || 0);

    if (!merchantId || amount <= 0 || Number.isNaN(amount)) {
      return { ok: false, message: "Enter a valid amount." };
    }

    // Optional: confirm requester is staff/owner for this merchant
    const { data: mu } = await supabase
      .from("merchant_users")
      .select("role")
      .eq("merchant_id", merchantId)
      .eq("user_id", user.id)
      .in("role", ["owner", "staff"])
      .maybeSingle();

    if (!mu) return { ok: false, message: "Not authorized for that merchant." };

    const amountCents = Math.round(amount * 100);
    const points = Math.max(Math.round(amount * POINTS_PER_DOLLAR), 0);

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // +2 minutes

    const { data: token, error } = await supabase
      .from("earn_tokens")
      .insert({
        merchant_id: merchantId,
        created_by: user.id,
        amount_cents: amountCents,
        points,
        expires_at: expiresAt,
      })
      .select("code")
      .maybeSingle();

    if (error || !token) {
      return { ok: false, message: "Could not create token. Try again." };
    }

    // Go to QR screen
    redirect(`/merchant/register/qr/${token.code}`);
  }

  return (
    <div className="max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-bold">Register Sale</h1>
      <form action={createToken} className="space-y-3">
        <div className="grid gap-1">
          <label className="text-sm">Merchant</label>
          <select
            name="merchant_id"
            className="rounded-xl bg-transparent border border-white/10 p-3"
            defaultValue={memberships[0].merchant_id}
          >
            {memberships.map((m) => (
              <option key={m.merchant_id} value={m.merchant_id}>
                {m.merchants?.name ?? m.merchant_id}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Amount ($)</label>
          <input
            name="amount"
            type="number"
            min={0.01}
            step="0.01"
            placeholder="e.g. 12.50"
            required
            className="rounded-xl bg-transparent border border-white/10 p-3"
          />
          <p className="text-xs text-white/60">
            {POINTS_PER_DOLLAR} point per $1.00 (configurable).
          </p>
        </div>

        <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">
          Create QR
        </button>
      </form>
    </div>
  );
}
