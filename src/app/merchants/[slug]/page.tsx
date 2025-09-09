// src/app/merchants/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServerClientSupabase } from "@/lib/supabase/server";
import Mapbox from "@/components/Mapbox";
import IssueVoucherButton from "./IssueVoucherButton";

export const dynamic = "force-dynamic";

// helper: are we logged in (server-side)?
async function isLoggedIn() {
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n, o) => cookieStore.set({ name: n, value: "", ...o, maxAge: 0 }),
      },
    }
  );
  const { data: { user } } = await sb.auth.getUser();
  return !!user;
}

export default async function MerchantDetail({ params }: { params: { slug: string } }) {
  const supabase = createServerClientSupabase();

  const { data: m } = await supabase
    .from("merchants")
    .select(
      "id, slug, name, category, lat, lng, address, phone, website, offer, how_to_earn, points_per_scan"
    )
    .eq("slug", params.slug)
    .maybeSingle();

  if (!m) notFound();

  const loggedIn = await isLoggedIn();

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-wide text-white/60">{m.category}</div>
          <h1 className="text-2xl font-bold">{m.name}</h1>
          {m.address && <div className="text-white/70">{m.address}</div>}
          {m.phone && <div className="text-white/70 text-sm mt-1">{m.phone}</div>}
          {m.website && (
            <a
              href={m.website}
              target="_blank"
              rel="noreferrer"
              className="text-seafoam text-sm mt-1 inline-block"
            >
              Visit website ↗
            </a>
          )}

          {/* Issue voucher CTA */}
          <div className="mt-3">
            {loggedIn ? (
              <IssueVoucherButton merchantId={m.id} />
            ) : (
              <Link href="/login" className="underline text-white/70">
                Sign in to get a voucher
              </Link>
            )}
          </div>
        </div>

        <Link href="/merchants" className="text-sm underline text-white/60">
          All merchants
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-2xl bg-[var(--card)] p-4 shadow-soft border border-white/10">
          <h3 className="font-semibold mb-2">Offer</h3>
          <p className="text-seafoam font-medium">
            {m.offer ?? "Ask about current specials"}
          </p>
          <h3 className="font-semibold mt-4 mb-2">How to earn</h3>
          <p className="text-white/80">{m.how_to_earn ?? "Scan QR at checkout."}</p>
          <div className="mt-3 text-white/70 text-sm">
            Points per scan: <b>{m.points_per_scan}</b>
          </div>
        </section>

        <section>
          <Mapbox
            pins={[
              {
                id: m.id,
                slug: m.slug,
                name: m.name,
                category: m.category,
                lat: m.lat,
                lng: m.lng,
              },
            ]}
            center={[m.lng, m.lat]}
            zoom={14}
          />
        </section>
      </div>
    </div>
  );
}
