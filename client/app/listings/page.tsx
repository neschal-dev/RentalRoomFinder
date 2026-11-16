import Link from "next/link";
import { Suspense } from "react";
import { ListingCardView } from "@/components/listing-card";
import { API_URL } from "@/lib/api";
import {
  CITIES,
  FURNISHINGS,
  PARKINGS,
  PROPERTY_TYPES,
  capitalize,
  type SearchResponse,
} from "@/lib/listings";

export const metadata = { title: "Find a place · FindMeAPlace" };

type Params = Record<string, string | string[] | undefined>;

const inputClass =
  "h-10 w-full rounded-md border border-black/15 bg-transparent px-3 text-sm dark:border-white/20";

// The page frame shows at once. The results stream in behind Suspense,
// because they depend on the URL (searchParams), which is only known at request time.
export default function ListingsPage({ searchParams }: PageProps<"/listings">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Find a place to rent</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Reads one value from the URL as plain text ("" when missing).
function one(params: Params, key: string): string {
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function SearchContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;

  // Pass on only the filters that have a value.
  const keys = [
    "city",
    "area",
    "propertyType",
    "minPrice",
    "maxPrice",
    "bedrooms",
    "furnishing",
    "parking",
    "petsAllowed",
    "sort",
    "page",
  ];
  const query = new URLSearchParams();
  for (const key of keys) {
    if (one(params, key)) query.set(key, one(params, key));
  }

  let result: SearchResponse | null = null;
  let errorText: string | null = null;
  try {
    const response = await fetch(`${API_URL}/listings?${query}`, {
      cache: "no-store",
    });
    if (response.ok) {
      result = (await response.json()) as SearchResponse;
    } else if (response.status === 400) {
      errorText =
        "Some filters are not valid. Check the prices and page number.";
    } else {
      errorText = "The server had a problem. Please try again.";
    }
  } catch {
    errorText = "Could not reach the server.";
  }

  // Link to another page, keeping the filters.
  const pageHref = (page: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(page));
    return `/listings?${next}`;
  };

  return (
    <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
      {/* A plain HTML form: it sends the filters as ?city=...&maxPrice=... to this same page. */}
      <form method="GET" action="/listings" className="space-y-3">
        <label className="block text-sm">
          City
          <select
            name="city"
            defaultValue={one(params, "city")}
            className={inputClass}
          >
            <option value="">All cities</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Area
          <input
            name="area"
            defaultValue={one(params, "area")}
            placeholder="e.g. Bazaar"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Type
          <select
            name="propertyType"
            defaultValue={one(params, "propertyType")}
            className={inputClass}
          >
            <option value="">Any</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {capitalize(t)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            Min rent
            <input
              name="minPrice"
              type="number"
              min={0}
              defaultValue={one(params, "minPrice")}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            Max rent
            <input
              name="maxPrice"
              type="number"
              min={0}
              defaultValue={one(params, "maxPrice")}
              className={inputClass}
            />
          </label>
        </div>
        <label className="block text-sm">
          Bedrooms (at least)
          <input
            name="bedrooms"
            type="number"
            min={0}
            max={20}
            defaultValue={one(params, "bedrooms")}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Furnishing
          <select
            name="furnishing"
            defaultValue={one(params, "furnishing")}
            className={inputClass}
          >
            <option value="">Any</option>
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
            name="parking"
            defaultValue={one(params, "parking")}
            className={inputClass}
          >
            <option value="">Any</option>
            {PARKINGS.map((p) => (
              <option key={p} value={p}>
                {capitalize(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="petsAllowed"
            value="true"
            defaultChecked={one(params, "petsAllowed") === "true"}
          />
          Pets allowed
        </label>
        <label className="block text-sm">
          Sort by
          <select
            name="sort"
            defaultValue={one(params, "sort") || "newest"}
            className={inputClass}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Rent: low to high</option>
            <option value="price_desc">Rent: high to low</option>
          </select>
        </label>
        <div className="flex gap-3">
          <button className="h-10 flex-1 cursor-pointer rounded-full bg-black text-sm font-medium text-white dark:bg-white dark:text-black">
            Search
          </button>
          <Link
            href="/listings"
            className="flex h-10 items-center text-sm underline"
          >
            Reset
          </Link>
        </div>
      </form>

      <section>
        {errorText && <p className="text-red-600">{errorText}</p>}

        {result && result.items.length === 0 && (
          <p className="text-zinc-500">No places match these filters.</p>
        )}

        {result && result.items.length > 0 && (
          <>
            <p className="mb-4 text-sm text-zinc-500">
              {result.total} {result.total === 1 ? "place" : "places"} found
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((listing) => (
                <ListingCardView key={listing.id} listing={listing} />
              ))}
            </div>

            {result.totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-4 text-sm">
                {result.page > 1 && (
                  <Link href={pageHref(result.page - 1)} className="underline">
                    ← Previous
                  </Link>
                )}
                <span>
                  Page {result.page} of {result.totalPages}
                </span>
                {result.page < result.totalPages && (
                  <Link href={pageHref(result.page + 1)} className="underline">
                    Next →
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
