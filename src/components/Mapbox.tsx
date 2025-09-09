"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export type MerchantPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  slug: string;
};

export default function Mapbox({
  pins,
  center,
  zoom = 12,
  onPinClick,
}: {
  pins: MerchantPin[];
  center: [number, number];
  zoom?: number;
  onPinClick?: (slug: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
    });

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [center, zoom]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // clear old markers
    (map as any)._bl_markers?.forEach((m: mapboxgl.Marker) => m.remove());
    (map as any)._bl_markers = [];

    // fit bounds to pins
    if (pins.length) {
      const bounds = new mapboxgl.LngLatBounds();
      pins.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }

    pins.forEach((p) => {
      const el = document.createElement("div");
      el.className = "rounded-full w-3.5 h-3.5 bg-seafoam border border-white shadow";
      el.style.cursor = "pointer";
      el.title = `${p.name} (${p.category})`;
      el.addEventListener("click", () => onPinClick?.(p.slug));

      const marker = new mapboxgl.Marker(el).setLngLat([p.lng, p.lat]).addTo(map);
      (map as any)._bl_markers.push(marker);
    });
  }, [pins, onPinClick]);

  return <div ref={mapRef} className="w-full h-[360px] rounded-2xl overflow-hidden border border-white/10" />;
}
