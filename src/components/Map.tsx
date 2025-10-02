'use client';

import { useEffect, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker, Popup, ViewState } from 'react-map-gl/mapbox';

type Beach = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

const FALLBACK_BEACHES: Beach[] = [
  { id: 'santa-monica', name: 'Santa Monica Beach', latitude: 34.0195, longitude: -118.4912 },
  { id: 'venice', name: 'Venice Beach', latitude: 33.9850, longitude: -118.4695 },
  { id: 'manhattan', name: 'Manhattan Beach', latitude: 33.8847, longitude: -118.4109 },
];

export default function MapComponent() {
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: -122.4,
    latitude: 37.8,
    zoom: 10,
  });

  const [beaches, setBeaches] = useState<Beach[]>(FALLBACK_BEACHES);
  const [selectedBeach, setSelectedBeach] = useState<Beach | null>(null);

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
        {beaches.map((b) => (
          <Marker key={b.id} longitude={b.longitude} latitude={b.latitude} anchor="bottom">
            <button
              className="text-2xl"
              onClick={(e) => {
                e.preventDefault();
                setSelectedBeach(b);
              }}
            >
              📍
            </button>
          </Marker>
        ))}

        {selectedBeach && (
          <Popup
            longitude={selectedBeach.longitude}
            latitude={selectedBeach.latitude}
            onClose={() => setSelectedBeach(null)}
            closeOnClick={false}
            anchor="top"
          >
            <div className="text-sm font-medium">{selectedBeach.name}</div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
