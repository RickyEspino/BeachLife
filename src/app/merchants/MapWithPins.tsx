"use client";

import { useRouter } from "next/navigation";
import Mapbox, { type MerchantPin } from "@/components/Mapbox";

export default function MapWithPins({
  pins,
  center,
}: {
  pins: MerchantPin[];
  center: [number, number];
}) {
  const router = useRouter();
  return (
    <Mapbox
      pins={pins}
      center={center}
      onPinClick={(slug) => router.push(`/merchants/${slug}`)}
    />
  );
}
