"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { MapTiles } from "./map-tiles";
import { pinIcon } from "./pin-icon";

export type LocationPickerProps = {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
};

// Listens for clicks on the map and reports where they landed.
function ClickToPlace({ onChange }: Pick<LocationPickerProps, "onChange">) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

// When the point is changed from outside the map (for example "Use my location", or a new
// city), move the map there. A point the owner just placed on the visible map is left alone.
function FollowPoint({ latitude, longitude }: Pick<LocationPickerProps, "latitude" | "longitude">) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().contains([latitude, longitude])) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
    }
  }, [map, latitude, longitude]);
  return null;
}

// The map in the listing form: click anywhere, or drag the pin, to set the location.
export default function LocationPickerInner({ latitude, longitude, onChange }: LocationPickerProps) {
  return (
    <MapContainer center={[latitude, longitude]} zoom={16} className="size-full">
      <MapTiles />
      <ClickToPlace onChange={onChange} />
      <FollowPoint latitude={latitude} longitude={longitude} />
      <Marker
        position={[latitude, longitude]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragend(event) {
            const { lat, lng } = event.target.getLatLng();
            onChange(lat, lng);
          },
        }}
      />
    </MapContainer>
  );
}
