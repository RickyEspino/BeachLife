// src/app/merchant/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerClientSupabase } from "@/lib/supabase/server";

// Always render fresh (no caching); staff needs live data
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Membership = {
  merchant_id: string;
  role: "owner" | "staff";
  merchants: {
    id: string;
    name: string;
    slug: string;
    points_per_scan: number | null;
  } | null;
};

function getOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Server Action: create a 2-minute earn token and bounce back with ?code=... */
export async function createEarnToken(_: unknown, formData: FormData) {
  "use server";

  const supabase = createServerClientSupabase();

  // Gate: must be authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const merchant_id = String(formData.get("merchant_id") || "");
  const amountStr = String(formData.get("amount") || "").trim();
  const amount = Number(amountStr);

  if (!merchant_id || Number.isNaN(amount) || amount <= 0) {
    redirect(`/merchant?err=bad_input`);
  }

  // Check membership
  const { data: membership } = await supabase
    .from("merchant_users")
    .select("merchant_id, role, merchants ( id, name, slug, points_per_scan )")
    .eq("user_id", user.id)
    .eq("merchant_id", merchant_id)
    .maybeSingle<Membership>();

  if (!membership) {
    redirect(`/merchant?err=forbidden`);
  }

  const pps = membership.merchants?.points_per_scan ?? 0;
  // Conversion: points_per_scan = points per $1
  const points = Math.max(Math.round(amount * (pps > 0 ? pps : 0)), 0);

  if (points <= 0) {
    redirect(`/merchant?err=zero_points`);
  }

  // Generate a code on the server
  const code = crypto.randomUUID();
  const expires = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // +2 minutes

  const { error: insErr } = await supabase.from("earn_tokens").insert({
    code,
    merchant_id,
    points,
    expires_at: expires,
  });

  if (insErr) {
    redirect(`/merchant?err=insert_failed`);
  }

  // Redirect back to the console, showing the QR for this code
  redirect(`/merchant?merchant=${merchant_id}&code=${code}`);
}

export default async function MerchantConsole({
  searchParams,
}: {
  searchParams: { merchant?: string; code?: string; err?: string };
}) {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all memberships for this user
  const { data: memberships } = await supabase
    .from("merchant_users")
    .select("merchant_id, role, merchants ( id, name, slug, points_per_scan )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true }) // remove if your table lacks this column
    .returns<Membership[]>();

  if (!memberships || memberships.length === 0) {
    return (
      <div className="max-w-2xl p-6">
        <h1 className="text-2xl font-bold mb-2">Merchant Console</h1>
        <p className="text-white/70">
          You don’t appear to be linked to any merchant. Ask an owner or admin to add you.
        </p>
      </div>
    );
  }

  const selectedId =
    searchParams.merchant && memberships.some((m) => m.merchant_id === searchParams.merchant)
      ? searchParams.merchant
      : memberships[0].merchant_id;

  const selected = memberships.find((m) => m.merchant_id === selectedId)!;
  const merchantName = selected.merchants?.name ?? "Merchant";
  const pps = selected.merchants?.points_per_scan ?? 0;

  const origin = getOrigin();
  const redeemPathBase = "/claim"; // ← use your existing claim route
  const code = searchParams.code || null;
  const redeemUrl = code ? `${origin}${redeemPathBase}/${code}` : null;

  return (
    <div className="max-w-2xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Merchant Console</h1>
        {/* Quick switcher when user linked to multiple merchants */}
        {memberships.length > 1 && (
          <form
            action="/merchant"
            method="get"
            className="flex items-center gap-2 text-sm"
          >
            <label className="text-white/70">Merchant</label>
            <select
              name="merchant"
              defaultValue={selectedId}
              className="rounded-xl bg-transparent border border-white/10 p-2"
            >
              {memberships.map((m) => (
                <option key={m.merchant_id} value={m.merchant_id}>
                  {m.merchants?.name ?? m.merchant_id.slice(0, 8)}
                </option>
              ))}
            </select>
            <button className="rounded-xl border border-white/10 px-3 py-1">
              Switch
            </button>
          </form>
        )}
      </div>

      <section className="rounded-2xl bg-[var(--card)] shadow-soft p-5 space-y-3">
        <div className="text-sm text-white/60">
          {merchantName} • Role: <span className="font-mono">{selected.role}</span>
        </div>
        <div className="text-white/70 text-sm">
          Current conversion: <span className="font-semibold">{pps}</span> points per $1.00
        </div>

        {/* Earn form */}
        <form action={createEarnToken} className="grid gap-3 mt-2">
          <input type="hidden" name="merchant_id" value={selectedId} />
          <label className="grid gap-1">
            <span className="text-sm text-white/80">Purchase Amount (USD)</span>
            <input
              name="amount"
              type="number"
              min={0.01}
              step="0.01"
              placeholder="e.g. 12.50"
              className="rounded-xl bg-transparent border border-white/10 p-3"
              required
            />
          </label>
          <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold w-max">
            Generate QR (valid 2 minutes)
          </button>
        </form>

        {searchParams.err && (
          <p className="text-sm text-red-400 mt-2">
            {searchParams.err === "bad_input" && "Please enter a valid amount."}
            {searchParams.err === "forbidden" && "You are not authorized for that merchant."}
            {searchParams.err === "zero_points" &&
              "That amount yields 0 points with the current conversion."}
            {searchParams.err === "insert_failed" && "Could not create token. Try again."}
          </p>
        )}
      </section>

      {/* QR panel (only when a code is present) */}
      {code && redeemUrl && (
        <section className="rounded-2xl bg-[var(--card)] shadow-soft p-5 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">One-time QR</h2>
            <span className="text-sm text-white/60">Expires in ~2 minutes</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="rounded-2xl overflow-hidden border border-white/10">
              {/* Hosted QR generator; no dependency needed */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  redeemUrl
                )}`}
                alt="QR code to redeem points"
                width={220}
                height={220}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-white/60">Scan opens</div>
              <a
                href={redeemUrl}
                className="underline break-all"
                target="_blank"
                rel="noreferrer"
              >
                {redeemUrl}
              </a>
              <div className="text-xs text-white/60">
                This code can be redeemed only once. If it’s already redeemed or expired, generate a new one.
              </div>
            </div>
          </div>

          <div className="pt-2">
            <a
              href={`/merchant?merchant=${selectedId}`}
              className="rounded-xl border border-white/10 px-4 py-2 inline-block"
            >
              Done
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
