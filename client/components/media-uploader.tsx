"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ImagePlus, Play, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createApi } from "@/lib/api";
import { DEMO } from "@/lib/demo";
import { MAX_MEDIA, MIN_PHOTOS, type MediaType } from "@/lib/listings";
import { describeUploadError, uploadMedia } from "@/lib/upload";
import { cn } from "@/lib/utils";

export type UploadedMedia = { url: string; mediaType: MediaType };

// One tile in the grid. While a file is uploading it has a local preview and a progress number.
type Item = {
  id: string;
  mediaType: MediaType;
  src: string; // the Cloudinary link, or a local preview while uploading
  status: "uploading" | "done" | "error";
  progress: number; // 0 to 100
  error?: string;
  fileName: string;
};

// How many files travel at the same time. More would slow each one down.
const PARALLEL_UPLOADS = 3;

let nextId = 0;
const makeId = () => `media-${nextId++}`;

// Photos and videos for a listing:
//  - drop files on the box, or pick them (several at once)
//  - a progress bar on each file while it uploads
//  - drag the tiles to reorder them; the first one is the cover
//  - "Make cover" moves a photo to the front with one click
// `onChange` receives the finished files in order, and whether anything is still uploading.
export function MediaUploader({
  initial,
  api,
  onChange,
  onError,
}: {
  initial: UploadedMedia[];
  api: ReturnType<typeof createApi>;
  onChange: (media: UploadedMedia[], uploading: boolean) => void;
  onError: (message: string | null) => void;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    initial.map((m) => ({
      id: makeId(),
      mediaType: m.mediaType,
      src: m.url,
      status: "done",
      progress: 100,
      fileName: "",
    })),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dropping, setDropping] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  // Tell the form what is finished, every time the list changes.
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  useEffect(() => {
    const done = items
      .filter((i) => i.status === "done")
      .map((i) => ({ url: i.src, mediaType: i.mediaType }));
    latest.current(
      done,
      items.some((i) => i.status === "uploading"),
    );
  }, [items]);

  // Only finished uploads count towards the rules; a file still travelling might yet fail.
  const photos = items.filter(
    (i) => i.mediaType === "image" && i.status === "done",
  ).length;
  const videos = items.filter(
    (i) => i.mediaType === "video" && i.status === "done",
  ).length;
  const uploadingCount = items.filter((i) => i.status === "uploading").length;

  function patch(id: string, changes: Partial<Item>) {
    setItems((list) =>
      list.map((i) => (i.id === id ? { ...i, ...changes } : i)),
    );
  }

  // Uploads one file and updates its tile as it goes.
  async function uploadOne(id: string, file: File) {
    try {
      const result = await uploadMedia(api, file, (percent) =>
        patch(id, { progress: percent }),
      );
      // The local preview is replaced by the real link.
      setItems((list) =>
        list.map((i) => {
          if (i.id !== id) return i;
          if (i.src.startsWith("blob:")) URL.revokeObjectURL(i.src);
          return { ...i, src: result.url, status: "done", progress: 100 };
        }),
      );
    } catch (error) {
      // The full error goes to the browser console for whoever is debugging.
      console.error("Upload failed", error);
      patch(id, { status: "error", error: describeUploadError(error) });
    }
  }

  // Takes the files from the picker or the drop, adds a tile for each, and uploads them 3 at a time.
  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    if (DEMO) {
      onError("Demo mode is on, so uploads are turned off.");
      return;
    }
    onError(null);

    const room = MAX_MEDIA - items.length;
    if (files.length > room) {
      onError(
        `A listing can have at most ${MAX_MEDIA} photos and videos. ${room > 0 ? `Only the first ${room} were added.` : ""}`.trim(),
      );
    }
    const accepted = files.slice(0, Math.max(room, 0));

    const queued = accepted.map((file) => ({
      id: makeId(),
      file,
    }));
    setItems((list) => [
      ...list,
      ...queued.map(({ id, file }): Item => {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        return {
          id,
          mediaType: isVideo ? "video" : "image",
          src: isVideo || isImage ? URL.createObjectURL(file) : "",
          status: isVideo || isImage ? "uploading" : "error",
          progress: 0,
          error:
            isVideo || isImage
              ? undefined
              : "Only photos and videos can be uploaded.",
          fileName: file.name,
        };
      }),
    ]);

    // A small pool: each worker takes the next file until none are left.
    const waiting = queued.filter(
      ({ file }) =>
        file.type.startsWith("image/") || file.type.startsWith("video/"),
    );
    let next = 0;
    async function worker() {
      while (next < waiting.length) {
        const job = waiting[next++]!;
        await uploadOne(job.id, job.file);
      }
    }
    void Promise.all(
      Array.from(
        { length: Math.min(PARALLEL_UPLOADS, waiting.length) },
        worker,
      ),
    );
  }

  function remove(id: string) {
    setItems((list) => {
      const gone = list.find((i) => i.id === id);
      if (gone?.src.startsWith("blob:")) URL.revokeObjectURL(gone.src);
      return list.filter((i) => i.id !== id);
    });
  }

  // Moves the tile at `from` so it ends up at `to`. A video is never allowed to become the cover.
  function move(from: number, to: number) {
    if (from === to) return;
    const reordered = [...items];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved!);
    if (reordered[0]?.mediaType === "video") {
      onError("A video cannot be the cover. Keep a photo first.");
      return;
    }
    onError(null);
    setItems(reordered);
  }

  const full = items.length >= MAX_MEDIA;
  const needed = Math.max(MIN_PHOTOS - photos, 0);

  return (
    <div className="space-y-4">
      {/* The rules, with live counts. */}
      <p
        className={cn(
          "text-sm",
          needed > 0 ? "text-warning" : "text-muted-foreground",
        )}
      >
        {uploadingCount > 0
          ? `Uploading ${uploadingCount} file${uploadingCount === 1 ? "" : "s"}… `
          : needed > 0
            ? `Add ${needed} more photo${needed === 1 ? "" : "s"} (at least ${MIN_PHOTOS} needed). `
            : "Photos look good. "}
        {photos} photo{photos === 1 ? "" : "s"}, {videos} video
        {videos === 1 ? "" : "s"}. A video is optional.
      </p>

      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item, index) => (
            <li
              key={item.id}
              draggable={item.status === "done"}
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = "move";
                // Firefox needs some data set before it starts a drag.
                e.dataTransfer.setData("text/plain", item.id);
              }}
              onDragOver={(e) => {
                // Only tile drags (not files dropped from the computer) are handled here.
                if (dragIndex === null) return;
                e.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                move(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={cn(
                "relative overflow-hidden rounded-lg bg-muted",
                item.status === "done" && "cursor-grab active:cursor-grabbing",
                dragIndex === index && "opacity-40",
                overIndex === index &&
                  dragIndex !== null &&
                  dragIndex !== index &&
                  "ring-2 ring-primary",
              )}
            >
              {item.mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.src}
                  alt=""
                  draggable={false}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <video
                  src={item.src}
                  muted
                  preload="metadata"
                  className="aspect-[4/3] w-full object-cover"
                />
              )}

              {item.mediaType === "video" && item.status === "done" && (
                <span className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
                  <Play className="size-3" aria-hidden="true" /> Video
                </span>
              )}

              {index === 0 && item.status === "done" && (
                <Badge tone="solid" className="absolute bottom-1.5 left-1.5">
                  Cover
                </Badge>
              )}

              {item.status === "done" &&
                index !== 0 &&
                item.mediaType === "image" && (
                  <button
                    type="button"
                    onClick={() => move(index, 0)}
                    className="absolute bottom-1.5 left-1.5 flex cursor-pointer items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white hover:bg-black/85"
                  >
                    <Star className="size-3" aria-hidden="true" /> Make cover
                  </button>
                )}

              {item.status === "uploading" && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 px-3 text-white"
                  role="progressbar"
                  aria-valuenow={item.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Uploading ${item.fileName}`}
                >
                  <span className="text-sm font-semibold">
                    {item.progress}%
                  </span>
                  <span className="h-1.5 w-full overflow-hidden rounded-full bg-white/30">
                    <span
                      className="block h-full rounded-full bg-white transition-[width]"
                      style={{ width: `${item.progress}%` }}
                    />
                  </span>
                </div>
              )}

              {item.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-danger-soft px-2 text-center text-xs text-danger">
                  <AlertCircle className="size-5" aria-hidden="true" />
                  <span>{item.error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => remove(item.id)}
                className="absolute right-1.5 top-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/85"
                aria-label={
                  item.status === "uploading"
                    ? "Cancel and remove this file"
                    : "Remove this file"
                }
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Drag a photo to change the order. The first one is the cover.
        </p>
      )}

      {!full && (
        <div
          onDragOver={(e) => {
            // Highlight only for files from the computer, not for tiles being reordered.
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDropping(true);
            }
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDropping(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center text-sm transition-colors hover:bg-muted",
            dropping ? "border-primary bg-muted" : "border-border",
          )}
          onClick={() => picker.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              picker.current?.click();
            }
          }}
        >
          <ImagePlus
            className="size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="font-medium">
            Drag photos and videos here, or click to choose
          </span>
          <span className="text-xs text-muted-foreground">
            Photos up to 10 MB, videos up to 100 MB. Up to {MAX_MEDIA} files.
          </span>
          <input
            ref={picker}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = ""; // so the same file can be picked again
            }}
            className="sr-only"
            tabIndex={-1}
          />
        </div>
      )}
    </div>
  );
}
