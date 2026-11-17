import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  Armchair,
  BedDouble,
  CalendarDays,
  Car,
  Check,
  ChevronLeft,
  Ruler,
  X,
} from "lucide-react";
import { Gallery } from "@/components/gallery";
import { ListingMap } from "@/components/map/listing-map";
import { fetchDetail } from "@/lib/server-data";
import {
  FURNISHING_LABELS,
  PARKING_LABELS,
  capitalize,
  formatDate,
  formatPrice,
} from "@/lib/listings";

// The frame shows at once; the listing streams in once the id is known.
export default function ListingPage({ params }: PageProps<"/listings/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/listings"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> All places
      </Link>
      <Suspense
        fallback={<p className="mt-6 text-muted-foreground">Loading…</p>}
      >
        <Detail params={params} />
      </Suspense>
    </main>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Missing, expired, hidden and malformed ids all show the same "not found" page.
  const listing = await fetchDetail(id);
  if (!listing) notFound();

  const images = listing.media.filter((m) => m.mediaType === "image");
  const videos = listing.media.filter((m) => m.mediaType === "video");

  const rules = [
    { label: "Pets", ok: listing.petsAllowed },
    { label: "Smoking", ok: listing.smokingAllowed },
    { label: "Alcohol", ok: listing.alcoholAllowed },
  ];

  const summary = [
    `${listing.bedrooms} ${listing.bedrooms === 1 ? "bedroom" : "bedrooms"}`,
    FURNISHING_LABELS[listing.furnishing],
    listing.sizeSqft ? `${listing.sizeSqft} sq ft` : null,
  ].filter(Boolean);

  return (
    <article className="mt-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {listing.title}
      </h1>
      <div className="mt-4">
        <Gallery images={images} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 divide-y divide-border [&>section]:py-7 [&>section:first-child]:pt-0">
          <section>
            <h2 className="font-display text-xl font-semibold">
              {capitalize(listing.propertyType)} in {listing.area},{" "}
              {listing.city}
            </h2>
            <p className="mt-1 text-muted-foreground">{summary.join(" · ")}</p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-semibold">
              About this place
            </h2>
            <p className="max-w-prose whitespace-pre-line leading-relaxed">
              {listing.description}
            </p>
          </section>

          {listing.facilities.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-semibold">
                What this place offers
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {listing.facilities.map((f) => (
                  <li key={f.id} className="flex items-center gap-3">
                    <Check className="size-5 text-success" aria-hidden="true" />
                    {f.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-1 font-display text-xl font-semibold">
              Where you will be
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {listing.area}, {listing.city}
              {listing.locationPrecision === "area"
                ? ". The owner shares the area only, so the circle is approximate."
                : ""}
            </p>
            <ListingMap
              latitude={listing.latitude}
              longitude={listing.longitude}
              precision={listing.locationPrecision}
              radiusMeters={listing.locationRadiusMeters}
            />
          </section>

          <section>
            <h2 className="mb-4 font-display text-xl font-semibold">
              House rules
            </h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {rules.map((rule) => (
                <li key={rule.label} className="flex items-center gap-3">
                  {rule.ok ? (
                    <Check className="size-5 text-success" aria-hidden="true" />
                  ) : (
                    <X className="size-5 text-danger" aria-hidden="true" />
                  )}
                  {rule.label} {rule.ok ? "allowed" : "not allowed"}
                </li>
              ))}
            </ul>
          </section>

          {videos.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-semibold">Video</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {videos.map((v) => (
                  <video
                    key={v.id}
                    src={v.url}
                    controls
                    className="aspect-video w-full rounded-xl bg-muted"
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* The summary stays on screen while the page scrolls (on wide screens). */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-lg">
            <p className="font-display text-3xl font-semibold tracking-tight">
              {formatPrice(listing.rentPrice)}
              <span className="ml-1 font-sans text-base font-normal text-muted-foreground">
                a month
              </span>
            </p>
            <dl className="space-y-3 border-t border-border pt-5 text-sm">
              <Fact
                icon={<CalendarDays />}
                label="Available from"
                value={formatDate(listing.availableFrom)}
              />
              <Fact
                icon={<BedDouble />}
                label="Bedrooms"
                value={String(listing.bedrooms)}
              />
              <Fact
                icon={<Ruler />}
                label="Size"
                value={
                  listing.sizeSqft ? `${listing.sizeSqft} sq ft` : "Not given"
                }
              />
              <Fact
                icon={<Armchair />}
                label="Furnishing"
                value={FURNISHING_LABELS[listing.furnishing]}
              />
              <Fact
                icon={<Car />}
                label="Parking"
                value={PARKING_LABELS[listing.parking]}
              />
            </dl>
            <p className="border-t border-border pt-4 text-xs text-muted-foreground">
              Messaging the owner is coming soon.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">
        {icon}
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
