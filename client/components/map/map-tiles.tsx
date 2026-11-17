import { TileLayer } from "react-leaflet";

// The map pictures come from OpenStreetMap. The attribution line is required by their rules.
// This public server is meant for light use; a tile provider can replace the URL later.
export function MapTiles() {
  return (
    <TileLayer
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      maxZoom={19}
    />
  );
}
