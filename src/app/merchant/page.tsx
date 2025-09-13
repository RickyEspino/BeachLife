// src/app/merchant/page.tsx
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/** Gate: only owners/staff of at least one merchant can access. */
async function requireMerchantRole() {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect_to=/merchant");

  // Find first merchant the user belongs to (owner or staff)
  const { data: mu } = await supabase
    .from("merchant_users")
    .select("merchant_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "staff"])
    .limit(1);

  const first = mu?.[0];
  if (!first) redirect("/dashboard");

  return { supabase, userId: user.id as string, merchantId: first.merchant_id as string };
}

/** Server action: create a short-lived earn token for a given dollar amount, then redirect to QR screen. */
export async function generateEarnToken(formData: FormData) {
  "use server";
  const { supabase, merchantId, userId } = await requireMerchantRole();

  const dollarsRaw = String(formData.get("amount") ?? "").trim();
  const dollars = Number(dollarsRaw);
  if (!Number.isFinite(dollars) || dollars <= 0) {
    redirect("/merchant?error=invalid_amount");
  }

  // Convert dollars -> cents & points (adjust conversion as needed).
  const amount_cents = Math.round(dollars * 100);
  const points = Math.round(dollars * 10); // $1 -> 10 points

  // Insert token valid for 2 minutes. IMPORTANT: include created_by and amount_cents (your table requires them).
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

  if (!tokenRow || error) {
    redirect("/merchant?error=token_create_failed");
  }

  redirect(`/merchant/register/qr/${tokenRow.code}`);
}

export default async function MerchantConsole() {
  const { supabase, merchantId } = await requireMerchantRole();

  // Fetch merchant name (optional)
  const { data: merchant } = await supabase
    .from("merchants")
    .select("name")
    .eq("id", merchantId)
    .maybeSingle();

  return (
    <div className="max-w-xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Merchant Console{merchant?.name ? ` — ${merchant.name}` : ""}
      </h1>

      {/* Register-style card */}
      <form action={generateEarnToken} className="rounded-2xl border border-white/10 p-5 space-y-3">
        <div>
          <label className="text-sm text-white/70">Purchase amount (USD)</label>
          <input
            name="amount"
            inputMode="decimal"
            placeholder="e.g. 12.50"
            className="mt-1 w-full rounded-xl bg-transparent border border-white/10 p-3"
            required
          />
          <p className="text-xs text-white/50 mt-1">
            We’ll convert dollars → points and create a 2-minute QR.
          </p>
        </div>

        <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">
          Generate QR
        </button>
      </form>

      <div className="text-sm text-white/60">
        After you generate the QR, ask the customer to scan it with their camera app. They’ll be taken
        to the app to claim points. The code auto-expires after 2 minutes and can only be redeemed once.
      </div>
    </div>
  );
}
