'use client';

import { useEffect, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker, Popup, ViewState } from 'react-map-gl/mapbox';

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
};

export default function MapComponent({ merchants = [], loadError }: Props) {
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: -122.4,
    latitude: 37.8,
    zoom: 10,
  });

  const [beaches] = useState<Beach[]>(FALLBACK_BEACHES); // retained for now
  const [selected, setSelected] = useState<BasePin | MerchantPin | null>(null);

  // Try to get the user's location and center the map
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setViewState((v) => ({ ...v, latitude, longitude, zoom: 12 }));
      },
      (err) => {
        // ignore; we already have a fallback view
        console.debug('Geolocation error', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 1000 * 60 * 5 }
    );
  }, []);

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
      </Map>
    </div>
  );
}

function isMerchantPin(p: BasePin | MerchantPin): p is MerchantPin {
  return (p as MerchantPin).category !== undefined;
}
