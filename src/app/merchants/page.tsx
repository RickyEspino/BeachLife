import Link from "next/link";
import { createServerClientSupabase } from "@/lib/supabase/server";
import MapWithPins from "./MapWithPins";
import NearMeList from "./NearMeList";
import { type MerchantPin } from "@/components/Mapbox";

export const dynamic = "force-dynamic";

type Merchant = {
  id: string; slug: string; name: string; category: string;
  lat: number; lng: number; offer: string | null; how_to_earn: string | null;
};

function CategoryFilter({ current }: { current?: string }) {
  const cats = ["all","food","nightlife","activity","shopping","golf","events","other"];
  return (
    <div className="flex gap-2 flex-wrap">
      {cats.map((c) => {
        const href = c === "all" ? "/merchants" : `/merchants?category=${c}`;
        const active = (current ?? "all") === c;
        return (
          <Link key={c} href={href}
            className={`px-3 py-1.5 rounded-xl border ${active ? "bg-seafoam border-seafoam" : "border-white/10 bg-white/5"}`}>
            {c}
          </Link>
        );
      })}
    </div>
  );
}

export default async function MerchantsPage({
  searchParams,
}: { searchParams: { category?: string } }) {
  const supabase = createServerClientSupabase();
  const category = searchParams.category && searchParams.category !== "all"
    ? searchParams.category
    : undefined;

  let query = supabase
    .from("merchants")
    .select("id, slug, name, category, lat, lng, offer, how_to_earn")
    .order("name", { ascending: true });

  if (category) query = query.eq("category", category);

  const { data: merchants, error } =
    (await query) as { data: Merchant[] | null; error: any };

  if (error) return <div className="p-4 text-red-400">Failed to load merchants.</div>;

  const pins: MerchantPin[] = (merchants ?? []).map((m) => ({
    id: m.id, slug: m.slug, name: m.name, category: m.category, lat: m.lat, lng: m.lng
  }));

  const defaultCenter: [number, number] = pins.length
    ? [pins[0].lng, pins[0].lat]
    : [-78.8867, 33.6891];

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Merchants</h1>
        <CategoryFilter current={category ?? "all"} />
      </div>

      {/* Client wrapper handles navigation; server passes only serializable props */}
      <MapWithPins pins={pins} center={defaultCenter} />

      {/* Client component handles geolocation & sorting */}
      <NearMeList merchants={merchants ?? []} />
    </div>
  );
}
