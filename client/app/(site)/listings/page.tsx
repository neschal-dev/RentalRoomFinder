import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { ListingCardView } from "@/components/listing-card";
import { SearchBar } from "@/components/search-bar";
import { buttonVariants } from "@/components/ui/button";
import { fetchSearch } from "@/lib/server-data";
import { capitalize } from "@/lib/listings";

export const metadata = { title: "Find a place · FindMeAPlace" };

type Params = Record<string, string | string[] | undefined>;

// The filters that can be in the URL, e.g. /listings?city=Banepa&maxPrice=15000
const FILTER_KEYS = [
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

// Reads one value from the URL as plain text ("" when missing).
function one(params: Params, key: string): string {
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

// The search results. The frame shows at once; the results stream in behind Suspense,
// because they depend on the URL (searchParams), which is only known at request time.
export default function ListingsPage({ searchParams }: PageProps<"/listings">) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 sm:px-6">
      <Suspense
        fallback={<p className="text-muted-foreground">Loading places…</p>}
      >
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;

  // Keep only the filters that have a value.
  const values: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    if (one(params, key)) values[key] = one(params, key);
  }
  const query = new URLSearchParams(values);
  const result = await fetchSearch(query);

  // Link to another page, keeping the filters.
  const pageHref = (page: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(page));
    return `/listings?${next}`;
  };

  // "Rooms in Banepa", "Flats", "Places to rent" ...
  const kind = values.propertyType
    ? `${capitalize(values.propertyType)}s`
    : "Places";
  const heading = values.city ? `${kind} in ${values.city}` : `${kind} to rent`;

  return (
    <>
      <div className="mx-auto max-w-4xl">
        <SearchBar values={values} />
      </div>

      <div className="mb-6 mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {heading}
        </h1>
        {result.ok && (
          <p className="text-sm text-muted-foreground">
            {result.data.total} {result.data.total === 1 ? "place" : "places"}
          </p>
        )}
      </div>

      {!result.ok && (
        <p className="rounded-xl bg-danger-soft p-4 text-danger">
          {result.message}
        </p>
      )}

      {result.ok && result.data.items.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
          <SearchX
            className="size-10 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="font-display text-xl font-semibold">
            No places match these filters
          </p>
          <p className="max-w-sm text-muted-foreground">
            Try a higher rent, another city, or fewer filters.
          </p>
          <Link
            href="/listings"
            className={buttonVariants({ variant: "outline" })}
          >
            Clear filters
          </Link>
        </div>
      )}

      {result.ok && result.data.items.length > 0 && (
        <>
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.data.items.map((listing) => (
              <ListingCardView key={listing.id} listing={listing} />
            ))}
          </div>

          {result.data.totalPages > 1 && (
            <nav
              className="mt-12 flex items-center justify-center gap-4 text-sm"
              aria-label="Pages"
            >
              {result.data.page > 1 && (
                <Link
                  href={pageHref(result.data.page - 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <ChevronLeft /> Previous
                </Link>
              )}
              <span className="text-muted-foreground">
                Page {result.data.page} of {result.data.totalPages}
              </span>
              {result.data.page < result.data.totalPages && (
                <Link
                  href={pageHref(result.data.page + 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Next <ChevronRight />
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
