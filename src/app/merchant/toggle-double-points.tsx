"use client";
import { useCallback, useEffect, useState } from 'react';

/**
 * DoublePointsToggle
 * Persists merchant IDs with active 2x promo in localStorage under key DOUBLE_POINTS_MERCHANTS.
 * Dispatches window event 'merchant:double-points-change' with detail { merchantIds: string[] } when changed.
 */
const STORAGE_KEY = 'DOUBLE_POINTS_MERCHANTS'; // legacy & v2 (objects)

type Promo = { id: string; expiresAt: number };

function migrate(input: unknown): Promo[] {
  if (Array.isArray(input)) {
    if (input.every(x => typeof x === 'string')) {
      // Legacy list of IDs => give them a default 1h expiry
      const now = Date.now();
      return input.map(id => ({ id, expiresAt: now + 60 * 60 * 1000 }));
    }
    if (input.every(x => x && typeof x.id === 'string' && typeof x.expiresAt === 'number')) {
      return input as Promo[];
    }
  }
  return [];
}

function readPromos(): Promo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    let promos = migrate(parsed);
    const now = Date.now();
    promos = promos.filter(p => p.expiresAt > now);
    return promos;
  } catch { return []; }
}

function writePromos(promos: Promo[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(promos));
    window.dispatchEvent(new CustomEvent('merchant:double-points-change', { detail: { merchantIds: promos.map(p => p.id), promos } }));
  } catch {}
}

const DURATIONS: { label: string; ms: number }[] = [
  { label: '30m', ms: 30 * 60 * 1000 },
  { label: '1h', ms: 60 * 60 * 1000 },
  { label: '2h', ms: 2 * 60 * 60 * 1000 },
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
];

export default function DoublePointsToggle({ merchantId }: { merchantId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [_promosState, setPromosState] = useState<Promo[]>([]); // underscore to silence unused var lint
  const [durationMs, setDurationMs] = useState<number>(DURATIONS[1].ms); // default 1h
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
  const ps = readPromos();
    setPromosState(ps); // Update to use _promosState
    const found = ps.find(p => p.id === merchantId);
    setEnabled(!!found);
    if (found) setRemaining(found.expiresAt - Date.now());
  }, [merchantId]);

  // Listen for cross-tab changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const ps = readPromos();
  setPromosState(ps);
        const found = ps.find(p => p.id === merchantId);
        setEnabled(!!found);
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as { promos?: Promo[] } | undefined;
      if (detail?.promos) {
  setPromosState(detail.promos);
        const found = detail.promos.find(p => p.id === merchantId);
        setEnabled(!!found);
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('merchant:double-points-change', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('merchant:double-points-change', onCustom as EventListener);
    };
  }, [merchantId]);

  // Remaining time ticker
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const current = readPromos();
      const found = current.find(p => p.id === merchantId);
      if (!found) { setEnabled(false); setRemaining(0); return; }
      const rem = found.expiresAt - Date.now();
      setRemaining(rem > 0 ? rem : 0);
      if (rem <= 0) setEnabled(false);
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, merchantId]);

  const toggle = useCallback(() => {
  setPromosState(prev => {
      const now = Date.now();
      let cleaned = prev.filter(p => p.expiresAt > now);
      const exists = cleaned.some(p => p.id === merchantId);
      if (exists) {
        cleaned = cleaned.filter(p => p.id !== merchantId);
        writePromos(cleaned);
        // Fire-and-forget server delete
        fetch(`/api/merchant-promos?merchantId=${encodeURIComponent(merchantId)}`, { method: 'DELETE' }).catch(() => {});
        setEnabled(false);
        setRemaining(0);
        return cleaned;
      } else {
        const next: Promo = { id: merchantId, expiresAt: now + durationMs };
        const updated = [...cleaned, next];
        writePromos(updated);
        // Fire-and-forget server upsert
        fetch('/api/merchant-promos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId, durationMs })
        }).catch(() => {});
        setEnabled(true);
        setRemaining(durationMs);
        return updated;
      }
    });
  }, [merchantId, durationMs]);

  const onChangeDuration = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setDurationMs(value);
    if (enabled) {
      // Extend/update current promo
  setPromosState(prev => {
        const now = Date.now();
        const updated = prev.map(p => p.id === merchantId ? { ...p, expiresAt: now + value } : p);
        writePromos(updated);
        fetch('/api/merchant-promos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId, durationMs: value })
        }).catch(() => {});
        setRemaining(value);
        return updated;
      });
    }
  };

  function formatRemaining(ms: number) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center justify-between gap-2 rounded-lg px-4 py-2 text-sm font-medium border transition shadow-sm ${enabled ? 'bg-amber-500 text-white border-amber-500' : 'bg-white hover:bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-amber-400/60`}
        title="Toggle 2× Points promo"
      >
        <span>2× Points</span>
        <span
          className={`inline-flex h-5 w-10 items-center rounded-full p-0.5 transition ${enabled ? 'bg-amber-600' : 'bg-gray-300'}`}
          aria-hidden
        >
          <span className={`h-4 w-4 rounded-full bg-white shadow transform transition ${enabled ? 'translate-x-5' : ''}`} />
        </span>
      </button>
      <div className="flex items-center gap-2">
        <select
          className="rounded-lg border px-2 py-1 text-xs bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60"
          value={durationMs}
          onChange={onChangeDuration}
          aria-label="2× Points duration"
        >
          {DURATIONS.map(d => <option key={d.ms} value={d.ms}>{d.label}</option>)}
        </select>
        {enabled && (
          <span className="text-[11px] font-medium text-amber-600" title="Time remaining">
            {formatRemaining(remaining)}
          </span>
        )}
      </div>
    </div>
  );
}
