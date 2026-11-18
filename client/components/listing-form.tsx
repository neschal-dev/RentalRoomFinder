"use client";

import { LocationPicker } from "@/components/map/location-picker";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DEMO } from "@/lib/demo";
import { SAMPLE_FACILITIES } from "@/lib/sample-listings";
import { MediaUploader } from "@/components/media-uploader";
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
  MIN_PHOTOS,
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
    existing?.latitude ?? CITY_CENTERS.Banepa.latitude,
  );
  const [longitude, setLongitude] = useState(
    existing?.longitude ?? CITY_CENTERS.Banepa.longitude,
  );
  // Off unless the owner chooses it: the public then sees a rough circle, not the door.
  const [showExactLocation, setShowExactLocation] = useState(
    existing?.showExactLocation ?? false,
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
      setLatitude(CITY_CENTERS[next].latitude);
      setLongitude(CITY_CENTERS[next].longitude);
    }
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(Number(position.coords.latitude.toFixed(6)));
        setLongitude(Number(position.coords.longitude.toFixed(6)));
      },
      () =>
        setErrors([
          "Could not read your location. Click the map to place the pin instead.",
        ]),
    );
  }

  function toggleFacility(id: string) {
    setFacilityIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors([]);
    if (DEMO) {
      setErrors(["Demo mode is on, so nothing is saved."]);
      return;
    }
    const photos = media.filter((m) => m.mediaType === "image").length;
    if (photos < MIN_PHOTOS) {
      setErrors([
        `Add at least ${MIN_PHOTOS} photos before you ${existing ? "save" : "post"} (you have ${photos}).`,
      ]);
      window.scrollTo({ top: 0, behavior: "smooth" });
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
      latitude,
      longitude,
      showExactLocation,
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
        </div>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Click the map or drag the pin to the property.
          </p>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              setLatitude(Number(lat.toFixed(6)));
              setLongitude(Number(lng.toFixed(6)));
            }}
          />
          <Button variant="outline" onClick={useMyLocation}>
            Use my current location
          </Button>
          <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={showExactLocation}
              onChange={(e) => setShowExactLocation(e.target.checked)}
              className="mt-1 size-4"
            />
            <span>
              <span className="font-medium">
                Show the exact location on the map
              </span>
              <span className="block text-muted-foreground">
                {showExactLocation
                  ? "Visitors will see a pin on the property."
                  : "Visitors will see a rough circle around the area, not the exact spot."}
              </span>
            </span>
          </label>
        </div>
      </Section>

      <Section
        title="Photos and videos"
        description="Show the room, the bathroom and the building. At least 3 photos; a video is optional."
      >
        <MediaUploader
          initial={media}
          api={api}
          onChange={(done, busy) => {
            setMedia(done);
            setUploading(busy);
          }}
          onError={(message) => setErrors(message ? [message] : [])}
        />
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
