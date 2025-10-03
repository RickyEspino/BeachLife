"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

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
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const closingRef = useRef(false);

  // Prevent background scroll when open (mobile-friendly)
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus for accessibility
  useEffect(() => {
    if (open && ref.current) {
      ref.current.focus();
    }
  }, [open]);

  const list = useMemo(() => {
    const filtered = category ? merchants.filter(m => (m.category || '') === category) : merchants;
    return filtered.slice(0, 50); // cap for performance
  }, [merchants, category]);

  const handleStart = useCallback((clientY: number) => {
    startY.current = clientY;
    closingRef.current = false;
  }, []);
  const handleMove = useCallback((clientY: number) => {
    if (startY.current == null) return;
    const delta = clientY - startY.current;
    if (delta < 0) { // don't drag upward
      setDragY(0);
      return;
    }
    setDragY(delta);
  }, []);
  const handleEnd = useCallback(() => {
    if (startY.current == null) return;
    if (dragY > 100) { // threshold to close
      closingRef.current = true;
      onClose?.();
    }
    startY.current = null;
    setDragY(0);
  }, [dragY, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" aria-modal="true" role="dialog" aria-label={category ? `${category} merchants` : 'Merchants'}>
      {/* Backdrop */}
      <button aria-label="Close" className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      {/* Sheet */}
      <div
        ref={ref}
        tabIndex={-1}
        className="absolute left-0 right-0 bottom-0 max-h-[70%] rounded-t-3xl bg-black/85 text-white backdrop-blur-md shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: startY.current ? 'none' : 'transform 160ms ease'
        }}
        onPointerDown={(e) => handleStart(e.clientY)}
        onPointerMove={(e) => handleMove(e.clientY)}
        onPointerUp={handleEnd}
        onPointerCancel={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientY)}
        onTouchEnd={handleEnd}
      >
        <div className="flex items-center justify-between py-2 px-3 select-none">
          <div className="flex-1 flex justify-center">
            <div className="h-1.5 w-10 rounded-full bg-white/30" />
          </div>
          <button
            type="button"
            aria-label="Close bottom sheet"
            onClick={onClose}
            className="ml-2 -mr-1 p-2 rounded-full hover:bg-white/10 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            ✕
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="text-sm text-white/80">{category || 'All'}</div>
          <h2 className="text-lg font-semibold">{list.length} Places</h2>
        </div>
        <div className="overflow-y-auto px-3 pb-[env(safe-area-inset-bottom)]" style={{ WebkitOverflowScrolling: 'touch' }}>
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
