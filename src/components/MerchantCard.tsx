import Link from "next/link";

export default function MerchantCard({
  slug, name, category, offer, how_to_earn, distanceKm,
}: {
  slug: string; name: string; category: string; offer?: string | null;
  how_to_earn?: string | null; distanceKm?: number | null;
}) {
  return (
    <Link href={`/merchants/${slug}`} className="block rounded-2xl bg-[var(--card)] p-4 shadow-soft border border-white/10 hover:border-seafoam/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm uppercase tracking-wide text-white/60">{category}</div>
          <h4 className="text-lg font-semibold">{name}</h4>
        </div>
        {typeof distanceKm === "number" && (
          <div className="text-xs text-white/60">{distanceKm.toFixed(1)} km</div>
        )}
      </div>
      {offer && <div className="mt-2 text-seafoam font-medium">{offer}</div>}
      {how_to_earn && <div className="mt-1 text-white/70 text-sm">{how_to_earn}</div>}
    </Link>
  );
}
