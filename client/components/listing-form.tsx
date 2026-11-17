"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createApi } from "@/lib/api";
import { ImagePlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DEMO } from "@/lib/demo";
import { SAMPLE_FACILITIES } from "@/lib/sample-listings";
import { uploadMedia } from "@/lib/upload";
import {
  CITIES,
  CITY_CENTERS,
  FURNISHINGS,
  FURNISHING_LABELS,
  PARKINGS,
  PARKING_LABELS,
  PROPERTY_TYPES,
  capitalize,
  errorLines,
  type City,
  type Facility,
  type MediaType,
  type MyListing,
} from "@/lib/listings";

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

  const [allFacilities, setAllFacilities] = useState<Facility[]>(
    DEMO ? SAMPLE_FACILITIES : [],
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // The facility checkboxes come from the server.
  useEffect(() => {
    if (DEMO) return;
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
    if (DEMO) {
      setErrors(["Demo mode is on, so uploads are turned off."]);
      return;
    }
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
    if (DEMO) {
      setErrors(["Demo mode is on, so nothing is saved."]);
      return;
    }
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

  const check = "size-4 accent-primary";

  return (
    <form onSubmit={submit} className="space-y-6">
      {errors.length > 0 && (
        <ul
          role="alert"
          className="list-disc space-y-1 rounded-xl border border-danger/40 bg-danger-soft p-4 pl-8 text-sm text-danger"
        >
          {errors.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      <Section
        title="The basics"
        description="A clear title and an honest description get more replies."
      >
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={5}
            maxLength={120}
            placeholder="For example, Sunny room near Banepa Hospital"
          />
        </Field>
        <Field
          label="Description"
          hint="At least 20 characters. Mention the floor, the neighbours, water and anything else a renter should know."
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={20}
            maxLength={5000}
            rows={6}
          />
        </Field>
      </Section>

      <Section title="The place">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Type">
            <Select
              value={propertyType}
              onChange={(e) =>
                setPropertyType(e.target.value as typeof propertyType)
              }
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {capitalize(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bedrooms">
            <Input
              type="number"
              min={0}
              max={20}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              required
            />
          </Field>
          <Field label="Size in sq ft" hint="Optional">
            <Input
              type="number"
              min={1}
              value={sizeSqft}
              onChange={(e) => setSizeSqft(e.target.value)}
            />
          </Field>
          <Field label="Furnishing">
            <Select
              value={furnishing}
              onChange={(e) =>
                setFurnishing(e.target.value as typeof furnishing)
              }
            >
              {FURNISHINGS.map((f) => (
                <option key={f} value={f}>
                  {FURNISHING_LABELS[f]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Parking">
            <Select
              value={parking}
              onChange={(e) => setParking(e.target.value as typeof parking)}
            >
              {PARKINGS.map((p) => (
                <option key={p} value={p}>
                  {PARKING_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Available from">
            <Input
              type="date"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              required
            />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">House rules</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className={check}
                checked={petsAllowed}
                onChange={(e) => setPetsAllowed(e.target.checked)}
              />{" "}
              Pets allowed
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className={check}
                checked={smokingAllowed}
                onChange={(e) => setSmokingAllowed(e.target.checked)}
              />{" "}
              Smoking allowed
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className={check}
                checked={alcoholAllowed}
                onChange={(e) => setAlcoholAllowed(e.target.checked)}
              />{" "}
              Alcohol allowed
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Facilities</legend>
          {allFacilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No facilities have been added yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allFacilities.map((f) => (
                <label
                  key={f.id}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                >
                  <input
                    type="checkbox"
                    className={check}
                    checked={facilityIds.includes(f.id)}
                    onChange={() => toggleFacility(f.id)}
                  />
                  {f.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </Section>

      <Section title="Rent">
        <Field label="Rent per month in NPR" className="sm:max-w-xs">
          <Input
            type="number"
            min={500}
            value={rentPrice}
            onChange={(e) => setRentPrice(e.target.value)}
            required
          />
        </Field>
      </Section>

      <Section
        title="Location"
        description="Renters see the area and city. The exact point is used to rank places by travel time later."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City">
            <Select
              value={city}
              onChange={(e) => changeCity(e.target.value as City)}
            >
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Area or neighbourhood" className="sm:col-span-2">
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
              minLength={2}
              maxLength={80}
            />
          </Field>
          <Field label="Latitude">
            <Input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
            />
          </Field>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={useMyLocation}
              className="w-full"
            >
              Use my current location
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Stand at the property and use your current location for the best
          result. A map picker is coming later.
        </p>
      </Section>

      <Section
        title="Photos and videos"
        description="Up to 15. The first one is the cover."
      >
        {media.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {media.map((item, index) => (
              <li key={item.url} className="relative">
                {item.mediaType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt=""
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                ) : (
                  <video
                    src={item.url}
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setMedia((list) => list.filter((_, i) => i !== index))
                  }
                  className="absolute right-1.5 top-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
                  aria-label="Remove this file"
                >
                  <X className="size-4" />
                </button>
                {index === 0 && (
                  <Badge tone="solid" className="absolute bottom-1.5 left-1.5">
                    Cover
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        {media.length < 15 && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-8 text-center text-sm hover:bg-muted">
            <ImagePlus
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="font-medium">
              {uploading ? "Uploading…" : "Choose photos or videos"}
            </span>
            <span className="text-xs text-muted-foreground">
              Photos up to 10 MB, videos up to 100 MB
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              disabled={uploading}
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = ""; // so the same file can be picked again
              }}
              className="sr-only"
            />
          </label>
        )}
      </Section>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="submit"
          size="lg"
          variant="accent"
          disabled={saving || uploading || !isLoaded}
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Post listing"}
        </Button>
      </div>
    </form>
  );
}

// A titled panel of the form.
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </Card>
  );
}
