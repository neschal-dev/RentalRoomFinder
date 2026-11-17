"use client";

import dynamic from "next/dynamic";
import type { LocationPickerProps } from "./location-picker-inner";

// Loaded only in the browser, like the listing map.
const Inner = dynamic(() => import("./location-picker-inner"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" />,
});

export function LocationPicker(props: LocationPickerProps) {
  return (
    <div role="region" aria-label="Pick the location on the map" className="isolate h-72 overflow-hidden rounded-xl border border-border sm:h-96">
      <Inner {...props} />
    </div>
  );
}
