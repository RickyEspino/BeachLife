'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker, Popup, ViewState, MapRef } from 'react-map-gl/mapbox';
import NextImage from 'next/image';
import MerchantPinIcon from '@/components/MerchantPinIcon';
// removed avatar Image for user marker; using GeolocateControl's built-in indicator

export type BasePin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type Beach = BasePin;

export type MerchantPin = BasePin & {
  category?: string;
};

export type MerchantPromo = { id: string; expiresAt: number };

const FALLBACK_BEACHES: Beach[] = [
  // Modest geographic spread — could be replaced with real seed beaches
  { id: 'santa-monica', name: 'Santa Monica Beach', latitude: 34.0195, longitude: -118.4912 },
  { id: 'venice', name: 'Venice Beach', latitude: 33.9850, longitude: -118.4695 },
  { id: 'manhattan', name: 'Manhattan Beach', latitude: 33.8847, longitude: -118.4109 },
];

type Props = {
  merchants?: MerchantPin[];
  loadError?: string;
  initialView?: { latitude: number; longitude: number; zoom?: number };
  focusId?: string;
  showUserLocation?: boolean;
  userAvatarUrl?: string;
  sharedUsers?: Array<{ id: string; username: string; avatarUrl?: string | null; latitude: number; longitude: number; updatedAt?: string }>;
  serverPromos?: MerchantPromo[];
};

type UnifiedPoint = {
  id: string;
  type: 'merchant' | 'user';
  name: string;
  latitude: number;
  longitude: number;
  avatarUrl?: string | null;
  category?: string;
  username?: string;
};

type Cluster = {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  points: UnifiedPoint[];
};

export default function MapComponent({ merchants = [], loadError, initialView, focusId, showUserLocation = false, userAvatarUrl, sharedUsers = [], serverPromos = [] }: Props) {
  const router = useRouter();
  const [mapRef, setMapRef] = useState<MapRef | null>(null);
  // Derive starting center: provided initialView > merchants centroid > fallback beaches[0]
  const centroid = useMemo(() => {
    if (!merchants.length) return null;
    const sum = merchants.reduce((acc, m) => {
      acc.lat += m.latitude; acc.lng += m.longitude; return acc;
    }, { lat: 0, lng: 0 });
    return { latitude: sum.lat / merchants.length, longitude: sum.lng / merchants.length };
  }, [merchants]);

  const fallbackOrigin = FALLBACK_BEACHES[0];

  const [viewState, setViewState] = useState<Partial<ViewState>>(() => ({
    longitude: initialView?.longitude ?? centroid?.longitude ?? fallbackOrigin.longitude,
    latitude: initialView?.latitude ?? centroid?.latitude ?? fallbackOrigin.latitude,
    zoom: initialView?.zoom ?? (initialView ? (initialView.zoom ?? 14) : merchants.length ? 13 : 11),
  }));

  // Static beaches constant (no state re-render churn)
  const beaches = FALLBACK_BEACHES;
  const [selected, setSelected] = useState<BasePin | MerchantPin | null>(null);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);
  // Special event: ephemeral King Crab spawn near user (client-side prototype)
  const [crabEvent, setCrabEvent] = useState<null | { latitude: number; longitude: number; expiresAt: number }>(null);
  const [crabCountdown, setCrabCountdown] = useState<number>(0);
  // Double points merchant IDs (client-only)
  const [doubleIds, setDoubleIds] = useState<string[]>([]);
  const [doubleMeta, setDoubleMeta] = useState<Record<string, number>>({}); // id -> expiresAt (0 if legacy/no expiry)
  const [showDoubleOnly, setShowDoubleOnly] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const KEY = 'DOUBLE_POINTS_MERCHANTS';
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [] as string[];
        const parsed = JSON.parse(raw);
        const now = Date.now();
        if (Array.isArray(parsed) && parsed.every(x => x && typeof x.id === 'string' && typeof x.expiresAt === 'number')) {
          const active = parsed.filter(p => p.expiresAt > now);
          const meta: Record<string, number> = {};
            for (const p of active) meta[p.id] = p.expiresAt;
          setDoubleMeta(meta);
          return active.map(p => p.id);
        }
        if (Array.isArray(parsed) && parsed.every(x => typeof x === 'string')) {
          // legacy list—no expiries
          setDoubleMeta(parsed.reduce((acc: Record<string, number>, id: string) => { acc[id] = 0; return acc; }, {}));
          return parsed as string[]; // legacy, no expiry
        }
      } catch {}
      return [] as string[];
    };
    setDoubleIds(read());
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setDoubleIds(read()); };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as { merchantIds?: string[]; promos?: { id: string; expiresAt: number }[] } | undefined;
      if (detail?.promos) {
        const now = Date.now();
        const active = detail.promos.filter(p => p.expiresAt > now);
        setDoubleMeta(active.reduce((acc: Record<string, number>, p) => { acc[p.id] = p.expiresAt; return acc; }, {}));
      }
      if (detail?.merchantIds) setDoubleIds(detail.merchantIds);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('merchant:double-points-change', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('merchant:double-points-change', onCustom as EventListener);
    };
  }, []);

  // Merge in server-provided promos (cross-device visibility)
  useEffect(() => {
    if (!serverPromos || serverPromos.length === 0) return;
    const now = Date.now();
    const active = serverPromos.filter(p => p && typeof p.id === 'string' && typeof p.expiresAt === 'number' && p.expiresAt > now);
    if (active.length === 0) return;
    setDoubleMeta(prev => {
      const merged = { ...prev };
      for (const p of active) merged[p.id] = p.expiresAt;
      return merged;
    });
    setDoubleIds(prev => {
      const set = new Set(prev);
      for (const p of active) set.add(p.id);
      return Array.from(set);
    });
  }, [serverPromos]);
  // One-shot geolocation (no UI control) — attempts once when showUserLocation is true.
  useEffect(() => {
    if (!showUserLocation) return;
    if (userPos) return;
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setUserPos({ latitude, longitude, accuracy });
      setViewState(v => ({ ...v, latitude, longitude }));
      setGeoDenied(false);
    }, (err) => {
      if (err.code === err.PERMISSION_DENIED) setGeoDenied(true);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }, [showUserLocation, userPos]);

  // Generate / refresh crab event once user position known
  useEffect(() => {
    if (!showUserLocation) return;
    if (!userPos) return;
    const now = Date.now();
    if (crabEvent && crabEvent.expiresAt > now) return; // still active
    // Create a spawn 40–90m away in a random direction to encourage micro-movement.
    const distanceM = 40 + Math.random() * 50; // 40-90m
    const bearing = Math.random() * Math.PI * 2;
    const metersPerDegLat = 111_111; // approx
    const metersPerDegLng = 111_111 * Math.cos(userPos.latitude * Math.PI / 180);
    const dLat = (Math.sin(bearing) * distanceM) / metersPerDegLat;
    const dLng = (Math.cos(bearing) * distanceM) / metersPerDegLng;
    const spawn = {
      latitude: userPos.latitude + dLat,
      longitude: userPos.longitude + dLng,
      expiresAt: now + 5 * 60 * 1000 // 5 minutes
    };
    setCrabEvent(spawn);
    try {
      localStorage.setItem('crabEvent', JSON.stringify(spawn));
      window.dispatchEvent(new CustomEvent('crab:event', { detail: spawn }));
    } catch {}
  }, [showUserLocation, userPos, crabEvent]);

  // Countdown effect
  useEffect(() => {
    if (!crabEvent) { setCrabCountdown(0); return; }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((crabEvent.expiresAt - Date.now()) / 1000));
      setCrabCountdown(rem);
      if (rem === 0) {
        // Auto-clear so it can respawn if user moves (or refreshes) later
        setCrabEvent(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [crabEvent]);

  // Auto focus a merchant if focusId provided
  useEffect(() => {
    if (!focusId) return;
    const target = merchants.find(m => m.id === focusId);
    if (target) {
      setSelected(target);
      setViewState(v => ({
        ...v,
        latitude: target.latitude,
        longitude: target.longitude,
        zoom: Math.max((v.zoom as number) || 0, 14) // ensure a reasonable focus zoom
      }));
    }
  }, [focusId, merchants]);

  // Visible merchants (respect 2× filter if active)
  const visibleMerchants = useMemo(() => (
    showDoubleOnly ? merchants.filter(m => doubleIds.includes(m.id)) : merchants
  ), [showDoubleOnly, merchants, doubleIds]);

  // Combine merchants + shared users for clustering
  const unifiedPoints: UnifiedPoint[] = useMemo(() => {
    const ms: UnifiedPoint[] = visibleMerchants.map(m => ({ id: m.id, type: 'merchant', name: m.name, latitude: m.latitude, longitude: m.longitude, category: m.category }));
    const us: UnifiedPoint[] = sharedUsers.map(u => ({ id: `u-${u.id}`, type: 'user', name: u.username, latitude: u.latitude, longitude: u.longitude, avatarUrl: u.avatarUrl, username: u.username }));
    return [...ms, ...us];
  }, [visibleMerchants, sharedUsers]);

  const zoom = (viewState.zoom as number) || 0;

  // Zoom-scaled clustering radius (in meters). Smaller at higher zoom so points "break apart".
  const clusterRadiusMeters = useMemo(() => {
    if (zoom < 5) return 120_000; // 120 km
    if (zoom < 6) return 60_000;
    if (zoom < 7) return 30_000;
    if (zoom < 8) return 15_000;
    if (zoom < 9) return 8_000;
    if (zoom < 10) return 4_000;
    if (zoom < 11) return 2_000;
    if (zoom < 12) return 1_000;
    if (zoom < 13) return 600;
    if (zoom < 14) return 300;
    if (zoom < 15) return 150;
    if (zoom < 16) return 70;
    return 30; // very fine at deep zoom
  }, [zoom]);

  // Haversine distance in meters
  function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
    const R = 6371000; // Earth radius meters
    const toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const lat1 = toRad(aLat);
    const lat2 = toRad(bLat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const clusters: Cluster[] = useMemo(() => {
    const list: Cluster[] = [];
    for (const p of unifiedPoints) {
      let target: Cluster | undefined;
      for (const c of list) {
        const dist = distanceMeters(c.latitude, c.longitude, p.latitude, p.longitude);
        if (dist <= clusterRadiusMeters) { target = c; break; }
      }
      if (target) {
        target.points.push(p);
        const n = target.points.length;
        target.latitude = target.latitude + (p.latitude - target.latitude) / n;
        target.longitude = target.longitude + (p.longitude - target.longitude) / n;
        target.count = n;
      } else {
        list.push({ id: p.id, latitude: p.latitude, longitude: p.longitude, count: 1, points: [p] });
      }
    }
    return list;
  }, [unifiedPoints, clusterRadiusMeters]);

  // Determine if the user avatar (self) sits inside a cluster; if so compute an offset direction.
  const selfOffset = useMemo(() => {
    if (!showUserLocation || !userPos || !userAvatarUrl) return { dx: 0, dy: 0 };
    const lat = userPos.latitude;
    const z = zoom || 0;
    const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z);
    const thresholdMeters = metersPerPixel * 50; // ~50px visual radius sum
    const nearby = clusters.find(c => {
      const dist = distanceMeters(c.latitude, c.longitude, userPos.latitude, userPos.longitude);
      // Ignore cluster representing only the user itself
      if (c.count === 1 && c.points[0].type === 'user') return false;
      return dist < thresholdMeters;
    });
    if (!nearby) return { dx: 0, dy: 0 };
    const angle = Math.atan2(userPos.latitude - nearby.latitude, userPos.longitude - nearby.longitude) || 0;
    const px = 42;
    return { dx: Math.cos(angle) * px, dy: Math.sin(angle) * px };
  }, [showUserLocation, userPos, userAvatarUrl, clusters, zoom]);

  const handleClusterClick = (c: Cluster) => {
    // Zoom in towards cluster center to expand
    const targetZoom = Math.min(((viewState.zoom as number) || 0) + 2, 18);
    mapRef?.flyTo({ center: [c.longitude, c.latitude], zoom: targetZoom, duration: 650, essential: true });
  };

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  // Central timestamp for promo urgency this render
  const renderNow = Date.now();
  const promoState = useCallback((id: string) => {
    if (!doubleIds.includes(id)) return { is2x: false, urgent: false, fading: false };
    const expiresAt = doubleMeta[id] || 0;
    if (!expiresAt) return { is2x: true, urgent: false, fading: false };
    const msLeft = expiresAt - renderNow;
    const urgent = msLeft > 0 && msLeft < 30 * 60 * 1000;
    const fading = !urgent && msLeft > 0 && msLeft < 60 * 60 * 1000;
    return { is2x: true, urgent, fading };
  }, [doubleIds, doubleMeta, renderNow]);

  return (
    <div className="fixed inset-0" role="region" aria-label="Interactive map of merchants and beaches">
      {!token && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
          <div className="text-lg font-semibold">Map disabled</div>
          <p className="text-sm max-w-sm text-gray-600 dark:text-gray-300">No Mapbox token configured. Set <code className="px-1 py-0.5 rounded bg-gray-800 text-white text-[11px]">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your env to enable interactive maps.</p>
          <div className="grid gap-2 text-xs text-left bg-white/70 dark:bg-white/10 rounded p-3 shadow">
            <span className="font-medium">Debug Info:</span>
            <span>Merchants loaded: {merchants.length}</span>
            <span>Shared users: {sharedUsers.length}</span>
            {loadError && <span className="text-red-600">Load error: {loadError}</span>}
          </div>
        </div>
      )}
      {token && (
      <Map
  {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
  ref={(ref) => { if (ref) setMapRef(ref); }}
        mapboxAccessToken={token}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
      >
        {/* Clustered points (merchants + shared users) */}
        {clusters.map(c => {
          if (c.count === 1) {
            const p = c.points[0];
            if (p.type === 'merchant') {
              const { is2x, urgent, fading } = promoState(p.id);
              if (showDoubleOnly && !is2x) return null;
              return (
                <Marker key={p.id} longitude={p.longitude} latitude={p.latitude} anchor="bottom">
                  <div className="relative" data-merchant-id={p.id} data-category={p.category || ''}>
                    <button
                      aria-label={`Merchant: ${p.name}${is2x ? ' (2x Points active)' : ''}`}
                      className="group relative focus:outline-none appearance-none bg-transparent p-0 border-0"
                      onClick={e => { e.preventDefault(); setSelected({ id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, category: p.category }); }}
                    >
                      <MerchantPinIcon category={p.category} />
                    </button>
                    {is2x && (
                      <span
                        className={`absolute -top-3 -right-3 rounded-full text-[10px] font-bold px-1.5 py-0.5 shadow ring-1 ring-black/10 select-none 
                          ${urgent ? 'bg-red-600 text-white animate-[pulse_0.8s_ease-in-out_infinite]' : fading ? 'bg-gradient-to-br from-amber-500/30 to-amber-400/20 text-amber-600 animate-pulse' : 'bg-amber-500 text-white animate-pulse'}`}
                        title={`2× Points Active${urgent ? ' (ending very soon)' : fading ? ' (ending soon)' : ''}`}
                      >2×</span>
                    )}
                  </div>
                </Marker>
              );
            } else {
              return (
                <Marker key={p.id} longitude={p.longitude} latitude={p.latitude} anchor="center">
                  <div className="relative -translate-y-1 -translate-x-1" title={p.username}>
                    {p.avatarUrl ? (
                      <NextImage
                        src={p.avatarUrl}
                        alt={p.username || 'user'}
                        width={38}
                        height={38}
                        className="h-9 w-9 rounded-full ring-2 ring-white shadow object-cover"
                        draggable={false}
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full ring-2 ring-white shadow bg-gradient-to-br from-gray-100 to-gray-300 grid place-items-center text-[11px] font-medium text-gray-700">
                        {p.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="pointer-events-none absolute inset-0 rounded-full ring ring-emerald-500/40 animate-pulse" aria-hidden="true" />
                  </div>
                </Marker>
              );
            }
          }
          // cluster marker
          // Determine if any merchant in cluster has 2x active
          let has2x = false; let hasUrgent = false; let hasFading = false;
          for (const pt of c.points) {
            if (pt.type !== 'merchant') continue;
            const st = promoState(pt.id);
            if (st.is2x) {
              has2x = true;
              if (st.urgent) hasUrgent = true; else if (st.fading) hasFading = true;
            }
          }
          if (showDoubleOnly && !has2x) return null; // hide clusters without any 2× when filter active
          return (
            <Marker key={`cluster-${c.id}-${c.count}`} longitude={c.longitude} latitude={c.latitude} anchor="center">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleClusterClick(c); }}
                aria-label={`Cluster with ${c.count} points${has2x ? hasUrgent ? ' including urgent 2× promos' : ' including 2× promos' : ''}`}
                className="relative h-12 w-12 rounded-full bg-emerald-600/80 backdrop-blur text-white font-semibold text-sm flex items-center justify-center shadow-lg ring-2 ring-white hover:scale-105 active:scale-95 transition"
              >
                {c.count}
                <span className="absolute -inset-1 rounded-full animate-ping bg-emerald-400/30" aria-hidden="true" />
                {has2x && (
                  <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center shadow ring-1 ring-black/10 
                    ${hasUrgent ? 'bg-red-600 text-white animate-[pulse_0.8s_ease-in-out_infinite]' : hasFading ? 'bg-amber-500/80 text-white animate-pulse' : 'bg-amber-500 text-white animate-pulse'}`}>2×</span>
                )}
              </button>
            </Marker>
          );
        })}
  {/* Periodic re-render each minute for fading state (simple interval) */}
  <Ticker minute />

        {/* Fallback beach pins (could later be hidden or toggled) */}
        {merchants.length === 0 && beaches.map((b) => (
          <Marker key={b.id} longitude={b.longitude} latitude={b.latitude} anchor="bottom">
            <button
              className="text-2xl"
              aria-label={`Beach: ${b.name}`}
              onClick={(e) => { e.preventDefault(); setSelected(b); }}
            >
              📍
            </button>
          </Marker>
        ))}

        {selected && (
          <Popup
            longitude={selected.longitude}
            latitude={selected.latitude}
            onClose={() => setSelected(null)}
            closeOnClick={false}
            anchor="top"
          >
            <div className="text-sm font-medium">{selected.name}</div>
            {isMerchantPin(selected) && selected.category && (
              <div className="text-xs text-gray-600 mt-1">{selected.category}</div>
            )}
          </Popup>
        )}

        {loadError && (
          <div className="absolute left-2 top-2 rounded bg-red-600/80 px-3 py-1 text-xs font-medium text-white">
            Failed to load merchants
          </div>
        )}

  {/* GeolocateControl still available for manual recenter & accuracy circle; we also did a one-shot auto locate above. */}

        {showUserLocation && geoDenied && !userPos && (
          <div className="absolute left-2 top-10 rounded bg-yellow-500/90 px-3 py-1 text-[10px] font-medium text-white" role="alert">
            Location blocked
          </div>
        )}

        {showUserLocation && (
          <button
            type="button"
            aria-label="Locate me"
            onClick={() => {
              if (!('geolocation' in navigator)) return;
              navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                setUserPos({ latitude, longitude, accuracy });
                setGeoDenied(false);
                // Animate to location with a standard close-in zoom (16) common in consumer map apps.
                mapRef?.flyTo({ center: [longitude, latitude], zoom: 16, essential: true, duration: 1200 });
                setViewState(v => ({ ...v, latitude, longitude, zoom: 16 }));
              }, (err) => {
                if (err.code === err.PERMISSION_DENIED) setGeoDenied(true);
              }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
            }}
            className="group absolute right-4 bottom-[calc(120px+var(--safe-bottom))] h-12 w-12 rounded-full bg-white/95 backdrop-blur border border-gray-200 flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.18),0_4px_12px_-2px_rgba(0,0,0,0.12)] active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-blue-500/70"
          >
            <span className="relative block h-7 w-7">
              <span className="absolute inset-0 rounded-full border-2 border-blue-500/70 group-hover:border-blue-600 transition shadow-inner" />
              <span className="absolute inset-1 rounded-full border border-blue-400/60 group-hover:border-blue-500 bg-gradient-to-br from-white to-blue-50" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-blue-600 group-hover:bg-blue-700 transition" />
              </span>
            </span>
            <span className="pointer-events-none absolute -bottom-5 text-[10px] font-medium tracking-wide text-gray-600 opacity-0 group-hover:opacity-100 transition">Locate</span>
          </button>
        )}

        {/* Filter toggle for 2x merchants */}
        <button
          type="button"
          onClick={() => setShowDoubleOnly(v => !v)}
          className={`absolute left-4 bottom-[calc(180px+var(--safe-bottom))] rounded-full px-4 py-2 text-xs font-semibold shadow border backdrop-blur transition ${showDoubleOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/90 hover:bg-white text-gray-700'}`}
        >
          {showDoubleOnly ? 'Showing 2× Only' : 'Show 2× Only'}
        </button>

        {/* Custom user avatar marker at user position (single fetch, no continuous tracking) */}
        {showUserLocation && userPos && userAvatarUrl && (
          <Marker longitude={userPos.longitude} latitude={userPos.latitude} anchor="center">
            <div
              className="relative"
              style={{ transform: `translate(${selfOffset.dx}px, ${selfOffset.dy}px)` }}
            >
              <div className="relative -translate-y-1 -translate-x-1">
                <NextImage
                  src={userAvatarUrl}
                  alt="Your avatar location"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full ring-2 ring-white shadow object-cover"
                  draggable={false}
                  priority
                />
                <span className="absolute inset-0 rounded-full ring ring-blue-500/40 animate-pulse pointer-events-none" aria-hidden="true" />
              </div>
              {selfOffset.dx !== 0 || selfOffset.dy !== 0 ? (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" aria-hidden>
                  <span
                    className="block h-0.5 w-8 bg-blue-400/50 rotate-[--angle] origin-left"
                    style={{ ['--angle' as string]: `${Math.atan2(selfOffset.dy, selfOffset.dx)}rad` } as React.CSSProperties}
                  />
                </div>
              ) : null}
            </div>
          </Marker>
        )}

        {/* Special Event: King Crab Spawn (prototype) */}
        {crabEvent && (
          <Marker longitude={crabEvent.longitude} latitude={crabEvent.latitude} anchor="center">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); router.push('/play/crab?event=king-crab'); }}
              aria-label="King Crab special event battle"
              className="group relative h-14 w-14 -mt-4 -ml-4 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-pink-500 shadow-xl ring-4 ring-white/70 hover:scale-110 active:scale-95 transition"
            >
              <span className="text-3xl drop-shadow-sm">🦀</span>
              <span className="pointer-events-none absolute -inset-1 rounded-full animate-ping bg-amber-400/30" aria-hidden="true" />
              {crabCountdown > 0 && (
                <span className="absolute -bottom-5 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-black/70 text-white">
                  {crabCountdown}s
                </span>
              )}
            </button>
          </Marker>
        )}

      </Map>
      )}
    </div>
  );
}

function isMerchantPin(p: BasePin | MerchantPin): p is MerchantPin {
  return (p as MerchantPin).category !== undefined;
}

// Approximate meters to pixels at current latitude & zoom.
// Formula: metersPerPixel = 156543.03392 * cos(lat * PI/180) / 2^zoom
// removed custom accuracyToPixels as we rely on GeolocateControl's accuracy circle

// Lightweight ticker component to force a re-render every minute (or custom interval)
function Ticker({ minute = false, intervalMs }: { minute?: boolean; intervalMs?: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const ms = intervalMs ?? (minute ? 60_000 : 1_000);
    const id = setInterval(() => setTick(t => (t + 1) % 1_000_000), ms);
    return () => clearInterval(id);
  }, [minute, intervalMs]);
  return null;
}

// MerchantPinIcon moved to its own component; import above.
