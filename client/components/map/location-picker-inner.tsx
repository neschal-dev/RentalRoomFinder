"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { addTiles, pinIcon } from "./leaflet-setup";

export type LocationPickerProps = {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
};

// The map in the listing form: click anywhere, or drag the pin, to set the location.
export default function LocationPickerInner({ latitude, longitude, onChange }: LocationPickerProps) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // The map reads the newest onChange without being rebuilt each time the form re-renders.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Start the map once (and again only if React remounts it).
  useEffect(() => {
    const element = box.current;
    if (!element) return;

    const map = L.map(element, { center: [latitude, longitude], zoom: 16 });
    addTiles(map);

    const marker = L.marker([latitude, longitude], { icon: pinIcon, draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const point = marker.getLatLng();
      onChangeRef.current(point.lat, point.lng);
    });
    map.on("click", (event: L.LeafletMouseEvent) => {
      onChangeRef.current(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The starting point is read once; later changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the point changes from outside (a new city, "Use my location"), follow it.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLatLng([latitude, longitude]);
    if (!map.getBounds().contains([latitude, longitude])) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
    }
  }, [latitude, longitude]);

  return <div ref={box} className="size-full" />;
}
