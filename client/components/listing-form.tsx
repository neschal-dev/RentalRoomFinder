"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createApi } from "@/lib/api";
import { uploadMedia } from "@/lib/upload";
import {
  CITIES,
  CITY_CENTERS,
  FURNISHINGS,
  PARKINGS,
  PROPERTY_TYPES,
  capitalize,
  errorLines,
  type City,
  type Facility,
  type MediaType,
  type MyListing,
} from "@/lib/listings";

const inputClass =
  "h-10 w-full rounded-md border border-black/15 bg-transparent px-3 text-sm dark:border-white/20";

// The add / edit form. Pass `existing` to edit a listing, leave it out to add a new one.
export function ListingForm({ existing }: { existing?: MyListing }) {
  const router = useRouter();
  const { isLoaded, getToken } = useAuth();
  const api = useMemo(() => createApi(getToken), [getToken]);

  // Every field starts from the existing listing, or from a sensible default.
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [propertyType, setPropertyType] = useState(
    existing?.propertyType ?? "room",
  );
  const [bedrooms, setBedrooms] = useState(String(existing?.bedrooms ?? 1));
  const [sizeSqft, setSizeSqft] = useState(
    existing?.sizeSqft ? String(existing.sizeSqft) : "",
  );
  const [furnishing, setFurnishing] = useState(existing?.furnishing ?? "none");
  const [parking, setParking] = useState(existing?.parking ?? "none");
  const [petsAllowed, setPetsAllowed] = useState(
    existing?.petsAllowed ?? false,
  );
  const [smokingAllowed, setSmokingAllowed] = useState(
    existing?.smokingAllowed ?? false,
  );
  const [alcoholAllowed, setAlcoholAllowed] = useState(
    existing?.alcoholAllowed ?? false,
  );
  const [rentPrice, setRentPrice] = useState(
    existing ? String(existing.rentPrice) : "",
  );
  const [city, setCity] = useState<City>(existing?.city ?? "Banepa");
  const [area, setArea] = useState(existing?.area ?? "");
  const [latitude, setLatitude] = useState(
    String(existing?.latitude ?? CITY_CENTERS.Banepa.latitude),
  );
  const [longitude, setLongitude] = useState(
    String(existing?.longitude ?? CITY_CENTERS.Banepa.longitude),
  );
  const [availableFrom, setAvailableFrom] = useState(
    existing?.availableFrom ?? "",
  );
  const [facilityIds, setFacilityIds] = useState<string[]>(
    existing?.facilities.map((f) => f.id) ?? [],
  );
  // Photos and videos already uploaded to Cloudinary. We keep only where each one can be found.
  const [media, setMedia] = useState<{ url: string; mediaType: MediaType }[]>(
    existing?.media.map((m) => ({ url: m.url, mediaType: m.mediaType })) ?? [],
  );
  const [uploading, setUploading] = useState(false);

  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // The facility checkboxes come from the server.
  useEffect(() => {
    api
      .get<Facility[]>("/facilities")
      .then((r) => setAllFacilities(r.data))
      .catch(() => {});
  }, [api]);

  // Choosing a city moves the coordinates to that city's centre (a new listing only).
  function changeCity(next: City) {
    setCity(next);
    if (!existing) {
      setLatitude(String(CITY_CENTERS[next].latitude));
      setLongitude(String(CITY_CENTERS[next].longitude));
    }
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
      },
      () =>
        setErrors([
          "Could not read your location. Type the coordinates instead.",
        ]),
    );
  }

  function toggleFacility(id: string) {
    setFacilityIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  // Uploads the chosen files one after another and adds them to the list.
  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErrors([]);
    setUploading(true);
    const added: { url: string; mediaType: MediaType }[] = [];
    try {
      for (const file of Array.from(files)) {
        if (media.length + added.length >= 15) {
          setErrors(["A listing can have at most 15 photos and videos."]);
          break;
        }
        added.push(await uploadMedia(api, file));
      }
    } catch (error) {
      setErrors(
        error instanceof Error && !("response" in error)
          ? [error.message]
          : errorLines(error),
      );
    }
    // Keep what uploaded fine, even if a later file failed.
    setMedia((list) => [...list, ...added]);
    setUploading(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors([]);
    setSaving(true);

    const body = {
      title,
      description,
      propertyType,
      bedrooms: Number(bedrooms),
      // On edit an empty box means "remove the size"; on create it is simply left out.
      ...(sizeSqft
        ? { sizeSqft: Number(sizeSqft) }
        : existing
          ? { sizeSqft: null }
          : {}),
      furnishing,
      parking,
      petsAllowed,
      smokingAllowed,
      alcoholAllowed,
      rentPrice: Number(rentPrice),
      city,
      area,
      latitude: Number(latitude),
      longitude: Number(longitude),
      availableFrom,
      facilityIds,
      media,
    };

    try {
      if (existing) {
        await api.patch(`/listings/${existing.id}`, body);
        router.push("/account/listings?saved=1");
      } else {
        const response = await api.post<MyListing>("/listings", body);
        router.push(`/account/listings?created=${response.data.status}`);
      }
    } catch (error) {
      setErrors(errorLines(error));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {errors.length > 0 && (
        <ul className="list-disc space-y-1 rounded-md border border-red-300 bg-red-50 p-4 pl-8 text-sm text-red-700">
          {errors.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      <label className="block text-sm">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={5}
          maxLength={120}
          className={inputClass}
        />
      </label>

      <label className="block text-sm">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={20}
          maxLength={5000}
          rows={5}
          className="w-full rounded-md border border-black/15 bg-transparent p-3 text-sm dark:border-white/20"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          Type
          <select
            value={propertyType}
            onChange={(e) =>
              setPropertyType(e.target.value as typeof propertyType)
            }
            className={inputClass}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {capitalize(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Bedrooms
          <input
            type="number"
            min={0}
            max={20}
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Size (sq ft, optional)
          <input
            type="number"
            min={1}
            value={sizeSqft}
            onChange={(e) => setSizeSqft(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Furnishing
          <select
            value={furnishing}
            onChange={(e) => setFurnishing(e.target.value as typeof furnishing)}
            className={inputClass}
          >
            {FURNISHINGS.map((f) => (
              <option key={f} value={f}>
                {capitalize(f)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Parking
          <select
            value={parking}
            onChange={(e) => setParking(e.target.value as typeof parking)}
            className={inputClass}
          >
            {PARKINGS.map((p) => (
              <option key={p} value={p}>
                {capitalize(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Rent per month (NPR)
          <input
            type="number"
            min={500}
            value={rentPrice}
            onChange={(e) => setRentPrice(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>

      <fieldset className="flex flex-wrap gap-6 text-sm">
        <legend className="mb-2">House rules</legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={petsAllowed}
            onChange={(e) => setPetsAllowed(e.target.checked)}
          />{" "}
          Pets allowed
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={smokingAllowed}
            onChange={(e) => setSmokingAllowed(e.target.checked)}
          />{" "}
          Smoking allowed
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={alcoholAllowed}
            onChange={(e) => setAlcoholAllowed(e.target.checked)}
          />{" "}
          Alcohol allowed
        </label>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          City
          <select
            value={city}
            onChange={(e) => changeCity(e.target.value as City)}
            className={inputClass}
          >
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          Area / neighbourhood
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Latitude
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Longitude
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={useMyLocation}
            className="h-10 cursor-pointer text-sm underline"
          >
            Use my current location
          </button>
        </div>
      </div>
      <p className="-mt-3 text-xs text-zinc-500">
        Stand at the property and use your current location for the best result.
        A map picker is coming later.
      </p>

      <label className="block text-sm sm:w-1/3">
        Available from
        <input
          type="date"
          value={availableFrom}
          onChange={(e) => setAvailableFrom(e.target.value)}
          required
          className={inputClass}
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm">Facilities</legend>
        {allFacilities.length === 0 ? (
          <p className="text-sm text-zinc-500">No facilities available yet.</p>
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {allFacilities.map((f) => (
              <label key={f.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={facilityIds.includes(f.id)}
                  onChange={() => toggleFacility(f.id)}
                />
                {f.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm">Photos and videos (up to 15)</legend>

        {media.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {media.map((item, index) => (
              <li key={item.url} className="relative">
                {item.mediaType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt=""
                    className="h-24 w-full rounded-md object-cover"
                  />
                ) : (
                  <video
                    src={item.url}
                    className="h-24 w-full rounded-md object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setMedia((list) => list.filter((_, i) => i !== index))
                  }
                  className="absolute right-1 top-1 cursor-pointer rounded-full bg-black/70 px-2 text-xs text-white"
                  aria-label="Remove"
                >
                  ✕
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 text-xs text-white">
                    Cover
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {media.length < 15 && (
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            disabled={uploading}
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = ""; // so the same file can be picked again
            }}
            className="text-sm"
          />
        )}
        {uploading && <p className="text-sm text-zinc-500">Uploading…</p>}
        <p className="text-xs text-zinc-500">
          Photos up to 10 MB, videos up to 100 MB. The first photo is the cover.
        </p>
      </fieldset>

      <button
        disabled={saving || uploading || !isLoaded}
        className="h-11 cursor-pointer rounded-full bg-black px-8 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {saving ? "Saving…" : existing ? "Save changes" : "Post listing"}
      </button>
    </form>
  );
}
