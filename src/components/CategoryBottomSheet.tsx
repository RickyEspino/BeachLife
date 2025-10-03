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

type SheetState = 'peek' | 'full';

export default function CategoryBottomSheet({ open, category, merchants, onClose, onSelectMerchant }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [sheetState, setSheetState] = useState<SheetState>('peek');
  const dragDirectionRef = useRef<'up' | 'down' | null>(null);
  const moveSamplesRef = useRef<Array<{ y: number; t: number }>>([]);

  // Presence + animation state (for enter/exit)
  const [present, setPresent] = useState(open);
  const [animOpen, setAnimOpen] = useState(false); // drives slide+fade
  useEffect(() => {
    if (open) {
      setPresent(true);
      // next frame trigger opening animation
      requestAnimationFrame(() => setAnimOpen(true));
    } else {
      // start exit animation
      setAnimOpen(false);
      const t = setTimeout(() => setPresent(false), 220); // matches transition
      return () => clearTimeout(t);
    }
  }, [open]);

  // Prevent background scroll when sheet is visually present (mobile-friendly)
  useEffect(() => {
    if (!present) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [present]);

  // Escape key to close
  useEffect(() => {
    if (!present) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [present, onClose]);

  // Focus for accessibility
  useEffect(() => {
    if (animOpen && ref.current) {
      ref.current.focus();
    }
  }, [animOpen]);

  const list = useMemo(() => {
    const filtered = category ? merchants.filter(m => (m.category || '') === category) : merchants;
    return filtered.slice(0, 50); // cap for performance
  }, [merchants, category]);

  const handleStart = useCallback((clientY: number) => {
    startY.current = clientY;
    dragDirectionRef.current = null;
    moveSamplesRef.current = [{ y: clientY, t: performance.now() }];
  }, []);
  const handleMove = useCallback((clientY: number) => {
    if (startY.current == null) return;
    const delta = clientY - startY.current; // positive = dragging down
    if (Math.abs(delta) < 4) return;
    dragDirectionRef.current = delta < 0 ? 'up' : 'down';
    moveSamplesRef.current.push({ y: clientY, t: performance.now() });
    // keep only recent samples (last 8 / 180ms)
    const cutoff = performance.now() - 180;
    moveSamplesRef.current = moveSamplesRef.current.filter(s => s.t >= cutoff);
    if (delta < 0) {
      // Limit upward visual drag to -60px (bounce)
      setDragY(Math.max(delta, -60));
    } else {
      setDragY(delta);
    }
  }, []);
  const handleEnd = useCallback(() => {
    if (startY.current == null) return;
    const delta = dragY;
    const samples = moveSamplesRef.current;
    const last = samples[samples.length - 1];
    const refSample = [...samples].findLast?.(s => last && (last.t - s.t) >= 40) || samples[0];
    let velocity = 0; // px per ms (+down, -up)
    if (last && refSample && last !== refSample) {
      velocity = (last.y - refSample.y) / (last.t - refSample.t);
    }

    const fastDown = velocity > 1.1; // flick down
    const fastUp = velocity < -1.0;  // flick up

    if (dragDirectionRef.current === 'up') {
      if (fastUp || delta < -50) {
        if (sheetState === 'peek') setSheetState('full');
      }
    } else if (dragDirectionRef.current === 'down') {
      if (fastDown || delta > 130) {
        if (sheetState === 'full') {
          setSheetState('peek');
        } else {
          onClose?.();
        }
      } else if (delta > 80 && sheetState === 'full') {
        // medium drag without flick collapses to peek
        setSheetState('peek');
      }
    }
    startY.current = null;
    dragDirectionRef.current = null;
    moveSamplesRef.current = [];
    setDragY(0);
  }, [dragY, sheetState, onClose]);

  // If category changes while open, reset to peek for consistent context
  useEffect(() => {
    if (open) setSheetState('peek');
  }, [category, open]);

  if (!present) return null;

  const isFull = sheetState === 'full';
  const baseHeightClass = isFull ? 'h-[70vh]' : 'h-[32vh]';
  const contentScrollable = 'overflow-y-auto flex-1 px-3 pb-[env(safe-area-inset-bottom)]';
  const show = animOpen; // drives opacity / slide for backdrop + sheet
  const baseTranslate = show ? 0 : 40; // px
  const backdropStyle: React.CSSProperties = {
    opacity: show ? 1 : 0,
    transition: 'opacity 200ms ease'
  };

  return (
    <div className="fixed inset-0 z-[60]" aria-modal="true" role="dialog" aria-label={category ? `${category} merchants` : 'Merchants'}>
      {/* Backdrop */}
      <div
        aria-label="Close"
        role="button"
        tabIndex={-1}
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        style={backdropStyle}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        ref={ref}
        tabIndex={-1}
        className={`absolute left-0 right-0 bottom-0 ${baseHeightClass} max-h-[90vh] flex flex-col rounded-t-3xl bg-black/85 text-white backdrop-blur-md shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-[height] duration-200 ease`}
        style={{
          transform: `translateY(${baseTranslate + dragY}px)`,
          opacity: show ? 1 : 0,
          transition: startY.current ? 'none' : 'transform 200ms cubic-bezier(.22,.7,.3,1), opacity 200ms ease, height 200ms ease'
        }}
      >
        <div
          className="flex items-center justify-between py-2 px-3 select-none cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handleStart(e.clientY)}
          onPointerMove={(e) => handleMove(e.clientY)}
          onPointerUp={handleEnd}
          onPointerCancel={handleEnd}
          onTouchStart={(e) => handleStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleMove(e.touches[0].clientY)}
          onTouchEnd={handleEnd}
        >
          <div className="flex-1 flex justify-center">
            <div className="h-1.5 w-10 rounded-full bg-white/40" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={isFull ? 'Collapse' : 'Expand'}
              onClick={() => setSheetState(s => s === 'full' ? 'peek' : 'full')}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 text-xs"
            >
              {isFull ? '▾' : '▴'}
            </button>
            <button
              type="button"
              aria-label="Close bottom sheet"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="text-sm text-white/80">{category || 'All'}</div>
          <h2 className="text-lg font-semibold">{list.length} Places</h2>
        </div>
        <div className={contentScrollable} style={{ WebkitOverflowScrolling: 'touch' }}>
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
