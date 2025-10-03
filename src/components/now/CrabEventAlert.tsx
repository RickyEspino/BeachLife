"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type CrabEventData = { latitude: number; longitude: number; expiresAt: number };

export default function CrabEventAlert() {
  const [eventData, setEventData] = useState<CrabEventData | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [geoDenied, setGeoDenied] = useState<boolean>(false);
  const router = useRouter();

  // Load from localStorage if exists
  useEffect(() => {
    try {
      const raw = localStorage.getItem('crabEvent');
      if (raw) {
        const data: CrabEventData = JSON.parse(raw);
        if (data.expiresAt > Date.now()) {
          setEventData(data);
        } else {
          localStorage.removeItem('crabEvent');
        }
      }
    } catch {}
  }, []);

  // Listen for new events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as CrabEventData;
      if (detail?.expiresAt > Date.now()) {
        setEventData(detail);
      }
    };
    window.addEventListener('crab:event', handler as EventListener);
    return () => window.removeEventListener('crab:event', handler as EventListener);
  }, []);

  // Countdown
  useEffect(() => {
    if (!eventData) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((eventData.expiresAt - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) {
        setEventData(null);
        try { localStorage.removeItem('crabEvent'); } catch {}
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [eventData]);

  // Distance calculation (one-shot + event update)
  useEffect(() => {
    if (!eventData) return;
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const d = haversineMeters(latitude, longitude, eventData.latitude, eventData.longitude);
      setDistanceM(d);
      setGeoDenied(false);
    }, (err) => {
      if (err.code === err.PERMISSION_DENIED) setGeoDenied(true);
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
  }, [eventData]);

  function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
    const R = 6371000;
    const toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const sLat1 = Math.sin(dLat / 2);
    const sLng1 = Math.sin(dLng / 2);
    const aa = sLat1 * sLat1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sLng1 * sLng1;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  }

  if (!eventData) return null;

  const distanceLabel = distanceM != null ? (distanceM < 1000 ? `${Math.round(distanceM)}m` : `${(distanceM/1000).toFixed(1)}km`) : geoDenied ? 'loc off' : '…';

  return (
    <div className="rounded-xl border bg-gradient-to-r from-amber-50 to-pink-50 dark:from-amber-900/30 dark:to-pink-900/30 p-4 shadow-sm ring-1 ring-amber-500/20 animate-[crabAlertIn_.55s_cubic-bezier(.22,1.1,.32,1)_both] relative overflow-hidden">
      <span className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-amber-400/20 blur-3xl animate-[pulse_4s_ease-in-out_infinite]" aria-hidden />
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>🦀</span>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-700 dark:text-amber-300 tracking-tight">King Crab Has Appeared!</h3>
          <p className="text-xs mt-1 text-amber-800/80 dark:text-amber-200/80">Limited-time battle nearby. Defeat it before it scuttles away.</p>
          <div className="mt-1 flex items-center gap-2 text-[10px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-200 px-2 py-0.5 ring-1 ring-amber-500/30">
              <span className="text-amber-600 dark:text-amber-300">Distance:</span>
              <strong className="font-semibold tabular-nums">{distanceLabel}</strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/15 text-pink-700 dark:text-pink-200 px-2 py-0.5 ring-1 ring-pink-500/30">
              <span>Expires:</span>
              <strong className="font-semibold tabular-nums">{remaining}s</strong>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => {
                router.push('/map');
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-500 text-white shadow hover:brightness-105 active:scale-95 transition"
            >
              Open Map
            </button>
            <button
              onClick={() => { setEventData(null); try { localStorage.removeItem('crabEvent'); } catch {} }}
              className="text-[11px] px-2 py-1 rounded-full bg-white/70 dark:bg-white/10 border border-amber-400/40 text-amber-700 dark:text-amber-200 hover:brightness-105"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes crabAlertIn { 0% { opacity:0; transform: translateY(-8px) scale(.96); } 60% { opacity:1; transform: translateY(2px) scale(1.01);} 100% {opacity:1; transform: translateY(0) scale(1);} }
      `}</style>
    </div>
  );
}
