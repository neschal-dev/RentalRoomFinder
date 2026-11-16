"use client";

import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import {
  FURNISHINGS,
  FURNISHING_LABELS,
  PARKINGS,
  PARKING_LABELS,
} from "@/lib/listings";

// The extra filters, in a pop-up. It lives INSIDE the search form, so its fields are sent
// together with the fields of the search bar when "Show places" is pressed.
export function MoreFilters({
  values,
  activeCount,
}: {
  values: Record<string, string>;
  activeCount: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button
        variant="outline"
        className="h-12 rounded-full px-5"
        onClick={() => dialog.current?.showModal()}
      >
        <SlidersHorizontal />
        Filters
        {activeCount > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      <dialog
        ref={dialog}
        // A click on the dark backdrop closes the pop-up.
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">More filters</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <Field label="Area">
            <Input
              name="area"
              defaultValue={values.area}
              placeholder="For example, Bazaar"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lowest rent">
              <Input
                name="minPrice"
                type="number"
                min={0}
                defaultValue={values.minPrice}
                placeholder="0"
              />
            </Field>
            <Field label="Bedrooms, at least">
              <Input
                name="bedrooms"
                type="number"
                min={0}
                max={20}
                defaultValue={values.bedrooms}
                placeholder="Any"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Furnishing">
              <Select name="furnishing" defaultValue={values.furnishing}>
                <option value="">Any</option>
                {FURNISHINGS.map((f) => (
                  <option key={f} value={f}>
                    {FURNISHING_LABELS[f]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Parking">
              <Select name="parking" defaultValue={values.parking}>
                <option value="">Any</option>
                {PARKINGS.map((p) => (
                  <option key={p} value={p}>
                    {PARKING_LABELS[p]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="petsAllowed"
              value="true"
              defaultChecked={values.petsAllowed === "true"}
              className="size-4 accent-primary"
            />
            Pets allowed
          </label>
          <Field label="Sort by">
            <Select name="sort" defaultValue={values.sort || "newest"}>
              <option value="newest">Newest first</option>
              <option value="price_asc">Rent, low to high</option>
              <option value="price_desc">Rent, high to low</option>
            </Select>
          </Field>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <Link
            href="/listings"
            className="text-sm font-semibold underline underline-offset-4"
          >
            Clear all
          </Link>
          <Button type="submit" size="lg">
            Show places
          </Button>
        </div>
      </dialog>
    </>
  );
}
