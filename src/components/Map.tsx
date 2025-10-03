'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker, Popup, ViewState, MapRef } from 'react-map-gl/mapbox';
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

export default function MapComponent({ merchants = [], loadError, initialView, focusId, showUserLocation = false, userAvatarUrl, sharedUsers = [] }: Props) {
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

  // Combine merchants + shared users for clustering
  const unifiedPoints: UnifiedPoint[] = useMemo(() => {
    const ms: UnifiedPoint[] = merchants.map(m => ({ id: m.id, type: 'merchant', name: m.name, latitude: m.latitude, longitude: m.longitude, category: m.category }));
    const us: UnifiedPoint[] = sharedUsers.map(u => ({ id: `u-${u.id}`, type: 'user', name: u.username, latitude: u.latitude, longitude: u.longitude, avatarUrl: u.avatarUrl, username: u.username }));
    return [...ms, ...us];
  }, [merchants, sharedUsers]);

  const zoom = (viewState.zoom as number) || 0;

  // Simple distance threshold in degrees (approx) based on zoom
  const clusterThreshold = useMemo(() => {
    if (zoom < 5) return 1.5; // very coarse
    if (zoom < 6) return 0.9;
    if (zoom < 7) return 0.5;
    if (zoom < 8) return 0.25;
    if (zoom < 9) return 0.12;
    if (zoom < 10) return 0.07;
    if (zoom < 11) return 0.04;
    if (zoom < 12) return 0.02;
    if (zoom < 13) return 0.01;
    if (zoom < 14) return 0.006;
    if (zoom < 15) return 0.004;
    return 0.002; // high zoom small cluster radius
  }, [zoom]);

  const clusters: Cluster[] = useMemo(() => {
    const list: Cluster[] = [];
    for (const p of unifiedPoints) {
      let target: Cluster | undefined;
      for (const c of list) {
        const dLat = Math.abs(c.latitude - p.latitude);
        const dLng = Math.abs(c.longitude - p.longitude);
        if (dLat <= clusterThreshold && dLng <= clusterThreshold) {
          target = c; break;
        }
      }
      if (target) {
        target.points.push(p);
        // incremental average to keep center stable
        const n = target.points.length;
        target.latitude = target.latitude + (p.latitude - target.latitude) / n;
        target.longitude = target.longitude + (p.longitude - target.longitude) / n;
        target.count = target.points.length;
      } else {
        list.push({ id: p.id, latitude: p.latitude, longitude: p.longitude, count: 1, points: [p] });
      }
    }
    return list;
  }, [unifiedPoints, clusterThreshold]);

  const handleClusterClick = (c: Cluster) => {
    // Zoom in towards cluster center to expand
    const targetZoom = Math.min(((viewState.zoom as number) || 0) + 2, 18);
    mapRef?.flyTo({ center: [c.longitude, c.latitude], zoom: targetZoom, duration: 650, essential: true });
  };

  return (
    <div className="fixed inset-0" role="region" aria-label="Interactive map of merchants and beaches">
      <Map
  {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
  ref={(ref) => { if (ref) setMapRef(ref); }}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
      >
        {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
          <div className="absolute left-2 top-2 z-10 rounded bg-red-600/90 px-3 py-1 text-[10px] font-medium text-white">
            Missing Mapbox token
          </div>
        )}
        {/* Clustered points (merchants + shared users) */}
        {clusters.map(c => {
          if (c.count === 1) {
            const p = c.points[0];
            if (p.type === 'merchant') {
              return (
                <Marker key={p.id} longitude={p.longitude} latitude={p.latitude} anchor="bottom">
                  <button
                    aria-label={`Merchant: ${p.name}`}
                    className="text-xl drop-shadow-sm"
                    onClick={e => { e.preventDefault(); setSelected({ id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, category: p.category }); }}
                  >
                    🏪
                  </button>
                </Marker>
              );
            } else {
              return (
                <Marker key={p.id} longitude={p.longitude} latitude={p.latitude} anchor="center">
                  <div className="relative -translate-y-1 -translate-x-1" title={p.username}>
                    {p.avatarUrl ? (
                      <Image
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
          return (
            <Marker key={`cluster-${c.id}-${c.count}`} longitude={c.longitude} latitude={c.latitude} anchor="center">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleClusterClick(c); }}
                aria-label={`Cluster with ${c.count} points`}
                className="relative h-12 w-12 rounded-full bg-emerald-600/80 backdrop-blur text-white font-semibold text-sm flex items-center justify-center shadow-lg ring-2 ring-white hover:scale-105 active:scale-95 transition"
              >
                {c.count}
                <span className="absolute -inset-1 rounded-full animate-ping bg-emerald-400/30" aria-hidden="true" />
              </button>
            </Marker>
          );
        })}

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

        {/* Custom user avatar marker at user position (single fetch, no continuous tracking) */}
        {showUserLocation && userPos && userAvatarUrl && (
          <Marker longitude={userPos.longitude} latitude={userPos.latitude} anchor="center">
            <div className="relative -translate-y-1 -translate-x-1">
              <Image
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
          </Marker>
        )}

      </Map>
    </div>
  );
}

function isMerchantPin(p: BasePin | MerchantPin): p is MerchantPin {
  return (p as MerchantPin).category !== undefined;
}

// Approximate meters to pixels at current latitude & zoom.
// Formula: metersPerPixel = 156543.03392 * cos(lat * PI/180) / 2^zoom
// removed custom accuracyToPixels as we rely on GeolocateControl's accuracy circle
