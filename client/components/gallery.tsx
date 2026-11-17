"use client";

import { Grid2x2, X } from "lucide-react";
import { useRef } from "react";
import type { Media } from "@/lib/listings";

// The photo grid at the top of a listing: one big photo and up to four small ones.
// "Show all photos" opens every photo in a pop-up.
export function Gallery({ images }: { images: Media[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [main, ...rest] = images;
  const small = rest.slice(0, 4);

  if (!main) {
    return (
      <div className="flex aspect-[16/7] items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        No photos yet
      </div>
    );
  }

  const open = () => dialog.current?.showModal();

  return (
    <>
      <div className="relative">
        <div
          className={`grid gap-2 overflow-hidden rounded-2xl sm:h-[26rem] ${small.length > 0 ? "sm:grid-cols-2" : ""}`}
        >
          <button
            type="button"
            onClick={open}
            className="block cursor-zoom-in overflow-hidden"
            aria-label="Open photos"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={main.url}
              alt=""
              className="aspect-[4/3] size-full object-cover transition-opacity hover:opacity-90 sm:aspect-auto"
            />
          </button>
          {small.length > 0 && (
            <div
              className={`hidden min-h-0 gap-2 sm:grid ${small.length >= 3 ? "grid-cols-2 grid-rows-2" : small.length === 2 ? "grid-cols-1 grid-rows-2" : "grid-cols-1"}`}
            >
              {small.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={open}
                  className="cursor-zoom-in overflow-hidden"
                  aria-label="Open photos"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-opacity hover:opacity-90"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {images.length > 1 && (
          <button
            type="button"
            onClick={open}
            className="absolute bottom-4 right-4 flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-900 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-100"
          >
            <Grid2x2 className="size-4" /> Show all photos
          </button>
        )}
      </div>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto h-[min(90vh,60rem)] w-[min(60rem,calc(100%-1.5rem))] rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <p className="font-display font-semibold">{images.length} photos</p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          {images.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.url}
              alt=""
              loading="lazy"
              className="w-full rounded-xl"
            />
          ))}
        </div>
      </dialog>
    </>
  );
}
