// src/app/merchant/register/page.tsx
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type MyMerchant = {
  id: string;
  name: string;
  role: "owner" | "staff";
};

/** Require an authenticated user who is owner/staff of at least one merchant. */
async function requireMerchantUser() {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect_to=/merchant/register");

  // Get memberships (owner/staff)
  const { data: memberships } = await supabase
    .from("merchant_users")
    .select("merchant_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "staff"]);

  if (!memberships || memberships.length === 0) {
    redirect("/dashboard");
  }

  // Fetch merchant names
  const ids = memberships.map((m) => m.merchant_id);
  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, name")
    .in("id", ids);

  const list: MyMerchant[] =
    (merchants ?? []).map((m) => {
      const role = memberships.find((x) => x.merchant_id === m.id)?.role ?? "staff";
      return { id: String(m.id), name: String(m.name ?? "Merchant"), role: role as "owner" | "staff" };
    }) ?? [];

  return { supabase, userId: user.id as string, merchants: list };
}

/** Server action: create a 2-minute earn token and redirect to the QR page. */
export async function createToken(formData: FormData): Promise<void> {
  "use server";
  const { supabase, merchants, userId } = await requireMerchantUser();

  const merchantId = String(formData.get("merchant_id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);

  // Basic guards
  const allowed = merchants.some((m) => m.id === merchantId);
  if (!allowed) redirect("/merchant/register?error=not_allowed");
  if (!Number.isFinite(amount) || amount <= 0) redirect("/merchant/register?error=invalid_amount");

  // Convert to cents/points
  const amount_cents = Math.round(amount * 100);
  const points = Math.round(amount * 10); // $1 -> 10 points

  const { data: tokenRow, error } = await supabase
    .from("earn_tokens")
    .insert({
      code: crypto.randomUUID(),
      merchant_id: merchantId,
      created_by: userId,
      amount_cents,
      points,
      expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    })
    .select("code")
    .maybeSingle();

  if (!tokenRow || error) redirect("/merchant/register?error=token_create_failed");

  redirect(`/merchant/register/qr/${tokenRow.code}`);
}

export default async function RegisterSalePage() {
  const { merchants } = await requireMerchantUser();
  const onlyOne = merchants.length === 1 ? merchants[0].id : "";

  return (
    <div className="max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-bold">Register Sale</h1>
      <p className="text-white/70 text-sm">
        Enter the purchase amount. We’ll convert it to points and generate a QR code that
        expires in 2 minutes. Have the customer scan it to claim points.
      </p>

      <form action={createToken} className="space-y-3 rounded-2xl border border-white/10 p-5">
        <div className="grid gap-1">
          <label className="text-sm">Merchant</label>
          <select
            name="merchant_id"
            defaultValue={onlyOne}
            className="rounded-xl bg-transparent border border-white/10 p-3"
            required
          >
            {!onlyOne && <option value="">Select a merchant…</option>}
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Amount (USD)</label>
          <input
            name="amount"
            inputMode="decimal"
            placeholder="e.g. 12.50"
            className="rounded-xl bg-transparent border border-white/10 p-3"
            required
          />
          <p className="text-xs text-white/50">Conversion: $1 → 10 points (configurable).</p>
        </div>

        <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">
          Generate QR
        </button>
      </form>
    </div>
  );
}
