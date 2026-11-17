"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { addTiles, pinIcon } from "./leaflet-setup";

export type ListingMapProps = {
  latitude: number;
  longitude: number;
  // "exact": a pin. "area": a circle of locationRadiusMeters around the point.
  precision: "exact" | "area";
  radiusMeters: number | null;
};

// The map on a listing page. It talks to Leaflet directly, which only works in the browser,
// so it is loaded through listing-map.tsx.
export default function ListingMapInner({ latitude, longitude, precision, radiusMeters }: ListingMapProps) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = box.current;
    if (!element) return;

    const map = L.map(element, {
      center: [latitude, longitude],
      zoom: precision === "exact" ? 16 : 15,
      // The page scrolls with the mouse wheel; the map zooms with the buttons or a double click.
      scrollWheelZoom: false,
    });
    addTiles(map);

    if (precision === "exact") {
      L.marker([latitude, longitude], { icon: pinIcon, keyboard: false }).addTo(map);
    } else {
      L.circle([latitude, longitude], {
        radius: radiusMeters ?? 400,
        color: "#1b4a5a",
        weight: 2,
        fillColor: "#1b4a5a",
        fillOpacity: 0.18,
      }).addTo(map);
    }

    // Removing the map when this component goes away lets React start it again safely.
    return () => {
      map.remove();
    };
  }, [latitude, longitude, precision, radiusMeters]);

  return <div ref={box} className="size-full" />;
}
