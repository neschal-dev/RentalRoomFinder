"use client";

import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, Marker } from "react-leaflet";
import { MapTiles } from "./map-tiles";
import { pinIcon } from "./pin-icon";

export type ListingMapProps = {
  latitude: number;
  longitude: number;
  // "exact": a pin. "area": a circle of locationRadiusMeters around the point.
  precision: "exact" | "area";
  radiusMeters: number | null;
};

// The map on a listing page. This file talks to Leaflet directly, which only works in the
// browser, so it is loaded through listing-map.tsx.
export default function ListingMapInner({ latitude, longitude, precision, radiusMeters }: ListingMapProps) {
  const center: [number, number] = [latitude, longitude];

  return (
    <MapContainer
      center={center}
      zoom={precision === "exact" ? 16 : 15}
      // The page scrolls with the mouse wheel; the map zooms with the buttons or a double click.
      scrollWheelZoom={false}
      className="size-full"
    >
      <MapTiles />
      {precision === "exact" ? (
        <Marker position={center} icon={pinIcon} keyboard={false} />
      ) : (
        <Circle
          center={center}
          radius={radiusMeters ?? 400}
          pathOptions={{ color: "#1b4a5a", weight: 2, fillColor: "#1b4a5a", fillOpacity: 0.18 }}
        />
      )}
    </MapContainer>
  );
}
