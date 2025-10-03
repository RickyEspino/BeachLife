"use client";
import { useEffect, useMemo, useRef } from 'react';

export type ListMerchant = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
  distanceKm?: number; // optional if we compute later
};

interface Props {
  open: boolean;
  category?: string | null;
  merchants: ListMerchant[];
  onClose?: () => void;
  onSelectMerchant?: (id: string) => void;
}

export default function CategoryBottomSheet({ open, category, merchants, onClose, onSelectMerchant }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Prevent background scroll when open (mobile-friendly)
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  const list = useMemo(() => {
    const filtered = category ? merchants.filter(m => (m.category || '') === category) : merchants;
    return filtered.slice(0, 50); // cap for performance
  }, [merchants, category]);

  return (
    <div className={`pointer-events-none absolute inset-0 z-[60] ${open ? '' : 'hidden'}`} aria-hidden={!open}>
      <div className="absolute inset-0" onClick={onClose} />
      <div
        ref={ref}
        className="pointer-events-auto absolute left-0 right-0 bottom-0 max-h-[70%] rounded-t-3xl bg-black/85 text-white backdrop-blur-md shadow-2xl"
        role="dialog"
        aria-label={category ? `${category} merchants` : 'Merchants'}
      >
        <div className="flex items-center justify-center py-2">
          <div className="h-1.5 w-10 rounded-full bg-white/30" />
        </div>
        <div className="px-4 pb-3">
          <div className="text-sm text-white/80">{category || 'All'}</div>
          <h2 className="text-lg font-semibold">{list.length} Places</h2>
        </div>
        <div className="overflow-y-auto px-3 pb-[env(safe-area-inset-bottom)]">
          <ul className="divide-y divide-white/10">
            {list.map(m => (
              <li key={m.id}>
                <button
                  onClick={() => onSelectMerchant?.(m.id)}
                  className="w-full text-left px-2 py-3 flex items-center gap-3 hover:bg-white/5 rounded-xl"
                >
                  <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center text-xl">📍</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-xs text-white/70 truncate">{m.category || '—'}</div>
                  </div>
                  {typeof m.distanceKm === 'number' && (
                    <div className="text-xs text-white/70 whitespace-nowrap">{m.distanceKm.toFixed(1)} km</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {list.length === 0 && (
            <div className="text-center text-sm text-white/70 py-10">No places yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
