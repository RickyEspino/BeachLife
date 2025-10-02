'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import Map from 'react-map-gl/mapbox';

export default function MapComponent() {
  return (
    <Map
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''}
      initialViewState={{
        longitude: -122.4,
        latitude: 37.8,
        zoom: 14,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v9"
    />
  );
}
