'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker, Popup, ViewState } from 'react-map-gl/mapbox';
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
};

export default function MapComponent({ merchants = [], loadError, initialView, focusId, showUserLocation = false, userAvatarUrl }: Props) {
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

  return (
    <div className="fixed inset-0" role="region" aria-label="Interactive map of merchants and beaches">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
      >
        {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
          <div className="absolute left-2 top-2 z-10 rounded bg-red-600/90 px-3 py-1 text-[10px] font-medium text-white">
            Missing Mapbox token
          </div>
        )}
        {/* Merchant pins */}
        {merchants.map(m => (
          <Marker key={m.id} longitude={m.longitude} latitude={m.latitude} anchor="bottom">
            <button
              aria-label={`Merchant: ${m.name}`}
              className="text-xl drop-shadow-sm"
              onClick={e => { e.preventDefault(); setSelected(m); }}
            >
              🏪
            </button>
          </Marker>
        ))}

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
                setViewState(v => ({ ...v, latitude, longitude }));
                setGeoDenied(false);
              }, (err) => {
                if (err.code === err.PERMISSION_DENIED) setGeoDenied(true);
              }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
            }}
            className="group absolute right-3 bottom-[calc(72px+var(--safe-bottom))] h-11 w-11 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="relative block h-6 w-6">
              <span className="absolute inset-0 rounded-full border-2 border-blue-500/70 group-hover:border-blue-600 transition" />
              <span className="absolute inset-1 rounded-full border border-blue-400/60 group-hover:border-blue-500" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-blue-600" />
            </span>
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
