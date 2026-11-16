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
  MapPin,
  Ruler,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
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
  const [main, ...others] = images;
  const thumbs = others.slice(0, 4);

  const rules = [
    { label: "Pets", ok: listing.petsAllowed },
    { label: "Smoking", ok: listing.smokingAllowed },
    { label: "Alcohol", ok: listing.alcoholAllowed },
  ];

  return (
    <article className="mt-4 grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-8">
        {main ? (
          <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={main.url}
              alt=""
              className={`aspect-[4/3] w-full rounded-xl object-cover sm:row-span-2 ${thumbs.length > 0 ? "sm:col-span-2" : "sm:col-span-4"} sm:h-full`}
            />
            {thumbs.map((item) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.id}
                src={item.url}
                alt=""
                loading="lazy"
                className="hidden aspect-[4/3] w-full rounded-xl object-cover sm:block"
              />
            ))}
          </div>
        ) : (
          <div className="flex aspect-[16/7] items-center justify-center rounded-xl bg-muted text-muted-foreground">
            No photos yet
          </div>
        )}

        <header>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="solid">{capitalize(listing.propertyType)}</Badge>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {listing.title}
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-4" aria-hidden="true" />
            {listing.area}, {listing.city}
          </p>
        </header>

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
            <h2 className="mb-3 font-display text-xl font-semibold">
              Facilities
            </h2>
            <ul className="flex flex-wrap gap-2">
              {listing.facilities.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm"
                >
                  <Check className="size-4 text-success" aria-hidden="true" />
                  {f.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">
            House rules
          </h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {rules.map((rule) => (
              <li
                key={rule.label}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                {rule.ok ? (
                  <Check className="size-4 text-success" aria-hidden="true" />
                ) : (
                  <X className="size-4 text-danger" aria-hidden="true" />
                )}
                {rule.label} {rule.ok ? "allowed" : "not allowed"}
              </li>
            ))}
          </ul>
        </section>

        {videos.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold">Video</h2>
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
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="space-y-5 p-5">
          <p className="font-display text-3xl font-semibold tracking-tight">
            {formatPrice(listing.rentPrice)}
            <span className="ml-1 font-sans text-base font-normal text-muted-foreground">
              a month
            </span>
          </p>
          <dl className="space-y-3 text-sm">
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
        </Card>
      </aside>
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
