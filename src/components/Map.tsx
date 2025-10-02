'use client';

import { useEffect, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker, Popup, ViewState, GeolocateControl } from 'react-map-gl/mapbox';
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
};

export default function MapComponent({ merchants = [], loadError, initialView, focusId, showUserLocation = false }: Props) {
  // Myrtle Beach default center (approx)
  const [viewState, setViewState] = useState<Partial<ViewState>>(() => ({
    longitude: initialView?.longitude ?? -78.8803,
    latitude: initialView?.latitude ?? 33.6954,
    zoom: initialView?.zoom ?? 12,
  }));

  const [beaches] = useState<Beach[]>(FALLBACK_BEACHES); // retained for now
  const [selected, setSelected] = useState<BasePin | MerchantPin | null>(null);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  // internal flag not exposed; we removed manual button so locating UI not needed
  const [locating, setLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  // Locator is now on-demand only; no persistent watch.

  // Auto attempt a single locate on mount (or when showUserLocation toggles on)
  useEffect(() => {
    if (!showUserLocation) return;
  if (userPos || locating) return; // already have or currently fetching
    // If Permissions API available, only auto-run if granted or prompt (avoid denied spam)
    let cancelled = false;
    (async () => {
      try {
        if (navigator.permissions) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          if (status.state === 'denied') return; // don't auto ask if denied
        }
        if (!cancelled) handleLocate();
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [showUserLocation, userPos, locating]);

  function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const newPos = { latitude, longitude, accuracy };
        setUserPos(newPos);
        setViewState((v) => ({ ...v, latitude, longitude }));
        setLocating(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoDenied(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  // Auto focus a merchant if focusId provided
  useEffect(() => {
    if (!focusId) return;
    const target = merchants.find(m => m.id === focusId);
    if (target) {
      setSelected(target);
      setViewState(v => ({ ...v, latitude: target.latitude, longitude: target.longitude }));
    }
  }, [focusId, merchants]);

  return (
    <div className="fixed inset-0">{/* fill viewport */}
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
      >
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

        {/* Using GeolocateControl's built-in indicator + accuracy circle; custom marker removed */}

        {showUserLocation && geoDenied && !userPos && (
          <div className="absolute left-2 top-10 rounded bg-yellow-500/90 px-3 py-1 text-[10px] font-medium text-white">
            Location blocked
          </div>
        )}

        {showUserLocation && (
          <div className="pointer-events-auto absolute right-3" style={{ bottom: 'calc(72px + var(--safe-bottom))' }}>
            <div className="rounded-xl bg-white shadow-md border border-gray-200 p-1">
              <GeolocateControl
                trackUserLocation={false}
                showUserHeading={false}
                showAccuracyCircle={true}
                onGeolocate={(e) => {
                  const { latitude, longitude, accuracy } = e.coords;
                  setUserPos({ latitude, longitude, accuracy });
                  setViewState((v) => ({ ...v, latitude, longitude }));
                }}
              />
            </div>
          </div>
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
