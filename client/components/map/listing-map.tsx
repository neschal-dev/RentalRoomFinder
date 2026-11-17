"use client";

import dynamic from "next/dynamic";
import type { ListingMapProps } from "./listing-map-inner";

// Leaflet needs the browser (it uses `window`), so the map is loaded only there.
// Until it arrives, a grey box of the same size holds the place and stops the page jumping.
const Inner = dynamic(() => import("./listing-map-inner"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" />,
});

// The map on a listing page: a pin when the owner shares the exact spot, a circle when not.
export function ListingMap(props: ListingMapProps) {
  return (
    <div role="region" aria-label="Map of the area" className="isolate h-80 overflow-hidden rounded-2xl border border-border">
      <Inner {...props} />
    </div>
  );
}
