import L from "leaflet";

// The pin on every map: a teal dot with a white edge and a marigold centre.
// It is drawn with HTML and CSS (see .map-pin in globals.css), so no image files are needed.
export const pinIcon = L.divIcon({
  className: "",
  html: '<div class="map-pin"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// The map pictures come from OpenStreetMap. The attribution line is required by their rules.
// This public server is meant for light use; a tile provider can replace the URL later.
export function addTiles(map: L.Map) {
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);
}
