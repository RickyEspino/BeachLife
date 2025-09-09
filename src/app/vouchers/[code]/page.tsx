import { notFound } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VoucherPage({ params }: { params: { code: string } }) {
  const supabase = createServerClientSupabase();
  const { data: v } = await supabase
    .from("vouchers")
    .select("code, status, merchant_id, issued_at, redeemed_at")
    .eq("code", params.code)
    .maybeSingle();

  if (!v) notFound();

  return (
    <div className="max-w-md mx-auto rounded-2xl bg-[var(--card)] p-6 shadow-soft border border-white/10">
      <h1 className="text-2xl font-bold">Your Voucher</h1>
      <div className="mt-3 text-sm text-white/60">Show this code to the merchant:</div>
      <div className="mt-3 text-3xl font-mono tracking-widest">{v.code}</div>
      <div className="mt-4">
        <span className={`inline-block px-2 py-1 rounded-md text-sm ${
          v.status === "issued" ? "bg-seafoam/20 border border-seafoam/40" :
          v.status === "redeemed" ? "bg-white/10 border border-white/20" :
          "bg-white/10 border border-white/20"
        }`}>
          {v.status.toUpperCase()}
        </span>
      </div>
      <div className="mt-4 text-white/60 text-sm">
        Issued: {new Date(v.issued_at).toLocaleString()}
        {v.redeemed_at && <div>Redeemed: {new Date(v.redeemed_at).toLocaleString()}</div>}
      </div>
    </div>
  );
}
