import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { API_URL } from "@/lib/api";
import { capitalize, formatRent, type ListingDetail } from "@/lib/listings";

// The frame shows at once; the listing streams in once the id is known.
export default function ListingPage({ params }: PageProps<"/listings/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <Link href="/listings" className="text-sm underline">
        ← All places
      </Link>
      <Suspense fallback={<p className="mt-6">Loading…</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const response = await fetch(`${API_URL}/listings/${id}`, {
    cache: "no-store",
  });
  // Missing, expired, hidden and malformed ids all show the same "not found" page.
  if (response.status === 404 || response.status === 400) notFound();
  if (!response.ok) throw new Error("Could not load the listing");
  const listing = (await response.json()) as ListingDetail;

  const rules = [
    listing.petsAllowed ? "Pets allowed" : "No pets",
    listing.smokingAllowed ? "Smoking allowed" : "No smoking",
    listing.alcoholAllowed ? "Alcohol allowed" : "No alcohol",
  ];

  return (
    <article className="mt-4 space-y-6">
      {listing.media.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {listing.media.map((item) =>
            item.mediaType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.id}
                src={item.url}
                alt=""
                className="h-64 w-full rounded-lg object-cover"
              />
            ) : (
              <video
                key={item.id}
                src={item.url}
                controls
                className="h-64 w-full rounded-lg object-cover"
              />
            ),
          )}
        </div>
      )}

      <header>
        <h1 className="text-2xl font-semibold">{listing.title}</h1>
        <p className="mt-1 text-zinc-500">
          {listing.area}, {listing.city}
        </p>
        <p className="mt-3 text-xl font-semibold">
          {formatRent(listing.rentPrice)}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-black/10 p-4 text-sm sm:grid-cols-3 dark:border-white/15">
        <Fact label="Type" value={capitalize(listing.propertyType)} />
        <Fact label="Bedrooms" value={String(listing.bedrooms)} />
        <Fact
          label="Size"
          value={listing.sizeSqft ? `${listing.sizeSqft} sq ft` : "Not given"}
        />
        <Fact label="Furnishing" value={capitalize(listing.furnishing)} />
        <Fact label="Parking" value={capitalize(listing.parking)} />
        <Fact label="Available from" value={listing.availableFrom} />
      </dl>

      <section>
        <h2 className="mb-2 font-semibold">About this place</h2>
        <p className="whitespace-pre-line">{listing.description}</p>
      </section>

      {listing.facilities.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Facilities</h2>
          <ul className="flex flex-wrap gap-2">
            {listing.facilities.map((f) => (
              <li
                key={f.id}
                className="rounded-full border border-black/15 px-3 py-1 text-sm dark:border-white/20"
              >
                {f.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">House rules</h2>
        <p className="text-sm">{rules.join(" · ")}</p>
      </section>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
