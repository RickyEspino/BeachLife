'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import Map from 'react-map-gl';

export default function MapComponent() {
  return (
    <Map
      mapboxAccessToken="pk.eyJ1IjoiZXNwaW5vd2VicyIsImEiOiJjbWc0OWFqcXAwMW94MmtweWFnYTI0ZXpzIn0.RSQUwJFHnIEyCjwRC1kiHQ"
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
