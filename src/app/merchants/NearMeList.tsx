"use client";

import { useEffect, useState } from "react";
import MerchantCard from "@/components/MerchantCard";
import { haversineKm } from "@/lib/geo";

type Merchant = {
  id: string; slug: string; name: string; category: string;
  lat: number; lng: number; offer: string | null; how_to_earn: string | null;
};

function sortByDistance(
  coords: GeolocationPosition["coords"],
  merchants: Merchant[]
) {
  const u = { lat: coords.latitude, lng: coords.longitude };
  return merchants
    .map((m) => ({ ...m, distanceKm: haversineKm(u, { lat: m.lat, lng: m.lng }) }))
    .sort((a, b) => (a.distanceKm! - b.distanceKm!));
}

export default function NearMeList({ merchants }: { merchants: Merchant[] }) {
  const [sorted, setSorted] =
    useState<(Merchant & { distanceKm?: number })[] | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setSorted(sortByDistance(pos.coords, merchants)),
      () => setDenied(true),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [merchants]);

  const list = sorted ?? merchants;

  return (
    <section className="rounded-2xl bg-[var(--card)] shadow-soft p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Nearby</h3>
        {!sorted && !denied && (
          <span className="text-xs text-white/60">Using default order…</span>
        )}
        {denied && (
          <span className="text-xs text-white/60">
            Location blocked — showing all
          </span>
        )}
      </div>

      {list.length === 0 ? (
        <p className="text-white/60">No merchants available.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((m) => (
            <MerchantCard
              key={m.slug}
              slug={m.slug}
              name={m.name}
              category={m.category}
              offer={m.offer}
              how_to_earn={m.how_to_earn}
              distanceKm={(m as any).distanceKm ?? null}
            />
          ))}
        </div>
      )}
    </section>
  );
}
