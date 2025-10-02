'use client';

import { useEffect, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker, Popup, ViewState } from 'react-map-gl/mapbox';
import Image from 'next/image';

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
  userAvatarUrl?: string;
};

export default function MapComponent({ merchants = [], loadError, initialView, focusId, showUserLocation = false, userAvatarUrl }: Props) {
  // Myrtle Beach default center (approx)
  const [viewState, setViewState] = useState<Partial<ViewState>>(() => ({
    longitude: initialView?.longitude ?? -78.8803,
    latitude: initialView?.latitude ?? 33.6954,
    zoom: initialView?.zoom ?? 12,
  }));

  const [beaches] = useState<Beach[]>(FALLBACK_BEACHES); // retained for now
  const [selected, setSelected] = useState<BasePin | MerchantPin | null>(null);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  // Locator is now on-demand only; no persistent watch.

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

        {showUserLocation && userPos && (
          <Marker longitude={userPos.longitude} latitude={userPos.latitude} anchor="center">
            <div className="relative">
              {/* Accuracy circle (hide if accuracy > 150m or missing) */}
              {typeof userPos.accuracy === 'number' && userPos.accuracy > 0 && userPos.accuracy <= 150 && (
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/15 border border-blue-400/30 transition-[width,height] duration-300 ease-out"
                  style={{
                    width: accuracyToPixels(userPos.accuracy, viewState.zoom ?? 10, userPos.latitude),
                    height: accuracyToPixels(userPos.accuracy, viewState.zoom ?? 10, userPos.latitude),
                  }}
                />
              )}
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-400/40" />
              {userAvatarUrl ? (
                <Image
                  src={userAvatarUrl}
                  alt="You"
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white shadow-md object-cover"
                  priority
                />
              ) : (
                <div className="h-8 w-8 rounded-full border-2 border-white bg-blue-500 text-white flex items-center justify-center text-xs font-semibold shadow-md">
                  You
                </div>
              )}
            </div>
          </Marker>
        )}

        {showUserLocation && geoDenied && !userPos && (
          <div className="absolute left-2 top-10 rounded bg-yellow-500/90 px-3 py-1 text-[10px] font-medium text-white">
            Location blocked
          </div>
        )}

        {showUserLocation && (
          <button
            type="button"
            onClick={handleLocate}
            className={`absolute right-3 top-3 z-50 h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-md border border-gray-200 transition-colors active:scale-[0.97] ${locating ? 'opacity-70' : 'hover:bg-gray-50'} ${userPos ? 'text-blue-600' : 'text-gray-700'}`}
            aria-label={userPos ? 'Recenter on my location' : 'Locate me'}
          >
            {/* Target / crosshair icon (pure CSS) */}
            <span className="relative block h-5 w-5">
              <span className="absolute inset-0 rounded-full border-2 border-current" />
              <span className="absolute left-1/2 top-0 h-1 w-0.5 -translate-x-1/2 bg-current" />
              <span className="absolute left-1/2 bottom-0 h-1 w-0.5 -translate-x-1/2 bg-current" />
              <span className="absolute top-1/2 left-0 w-1 h-0.5 -translate-y-1/2 bg-current" />
              <span className="absolute top-1/2 right-0 w-1 h-0.5 -translate-y-1/2 bg-current" />
              <span className={`absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${locating ? 'bg-current animate-pulse' : 'bg-current/90'}`} />
            </span>
            <span className="sr-only">{locating ? 'Locating' : (userPos ? 'Recenter' : 'Locate')}</span>
          </button>
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
function accuracyToPixels(meters: number, zoom: number, latitude: number): string {
  const metersPerPixel = 156543.03392 * Math.cos(latitude * Math.PI / 180) / Math.pow(2, zoom);
  if (metersPerPixel <= 0 || !isFinite(metersPerPixel)) return '0px';
  const diameterPx = (meters / metersPerPixel) * 2; // full diameter
  const clamped = Math.min(Math.max(diameterPx, 8), 300); // clamp between 8px and 300px
  return `${clamped.toFixed(1)}px`;
}
