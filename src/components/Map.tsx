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
  const [viewState, setViewState] = useState<Partial<ViewState>>(() => ({
    longitude: initialView?.longitude ?? -122.4,
    latitude: initialView?.latitude ?? 37.8,
    zoom: initialView?.zoom ?? 10,
  }));

  const [beaches] = useState<Beach[]>(FALLBACK_BEACHES); // retained for now
  const [selected, setSelected] = useState<BasePin | MerchantPin | null>(null);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);
  // When showUserLocation is true we watch geolocation and render a pulsing marker.
  // Avatar image (if provided) is displayed inside the marker; otherwise a fallback circle with 'You'.

  // Try to get the user's location and center the map only if no explicit initialView provided
  useEffect(() => {
    if (!showUserLocation) return;
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos({ latitude, longitude });
        if (!initialView) {
          setViewState((v) => ({ ...v, latitude, longitude }));
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoDenied(true);
      },
      { enableHighAccuracy: true, maximumAge: 1000 * 30, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [showUserLocation, initialView]);

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
      </Map>
    </div>
  );
}

function isMerchantPin(p: BasePin | MerchantPin): p is MerchantPin {
  return (p as MerchantPin).category !== undefined;
}
