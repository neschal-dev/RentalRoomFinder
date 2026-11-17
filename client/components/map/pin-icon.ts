import L from "leaflet";

// The pin on every map: a teal dot with a white edge and a marigold centre.
// It is drawn with HTML and CSS (see .map-pin in globals.css), so no image files are needed.
export const pinIcon = L.divIcon({
  className: "",
  html: '<div class="map-pin"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});
