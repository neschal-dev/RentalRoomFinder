import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { FiltersToggle } from "@/components/filters-toggle";
import { ListingCardView } from "@/components/listing-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { fetchSearch } from "@/lib/server-data";
import {
  CITIES,
  FURNISHINGS,
  FURNISHING_LABELS,
  PARKINGS,
  PARKING_LABELS,
  PROPERTY_TYPES,
  capitalize,
} from "@/lib/listings";

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

// The page frame shows at once. The results stream in behind Suspense,
// because they depend on the URL (searchParams), which is only known at request time.
export default function ListingsPage({ searchParams }: PageProps<"/listings">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <Suspense
        fallback={<p className="text-muted-foreground">Loading places…</p>}
      >
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;

  // Pass on only the filters that have a value.
  const query = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (one(params, key)) query.set(key, one(params, key));
  }
  const activeFilters = FILTER_KEYS.filter(
    (k) => k !== "page" && k !== "sort" && one(params, k),
  ).length;

  const result = await fetchSearch(query);

  // Link to another page, keeping the filters.
  const pageHref = (page: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(page));
    return `/listings?${next}`;
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {one(params, "city")
            ? `Places in ${one(params, "city")}`
            : "Places to rent"}
        </h1>
        {result.ok && (
          <p className="mt-1 text-muted-foreground">
            {result.data.total} {result.data.total === 1 ? "place" : "places"}{" "}
            available
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[17rem_1fr] md:items-start">
        <FiltersToggle activeCount={activeFilters}>
          {/* A plain HTML form: it sends the filters as ?city=...&maxPrice=... to this same page. */}
          <Card className="md:sticky md:top-20">
            <form method="GET" action="/listings" className="space-y-4 p-4">
              <Field label="City">
                <Select name="city" defaultValue={one(params, "city")}>
                  <option value="">All cities</option>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Area">
                <Input
                  name="area"
                  defaultValue={one(params, "area")}
                  placeholder="For example, Bazaar"
                />
              </Field>
              <Field label="Type">
                <Select
                  name="propertyType"
                  defaultValue={one(params, "propertyType")}
                >
                  <option value="">Any type</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {capitalize(t)}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min rent">
                  <Input
                    name="minPrice"
                    type="number"
                    min={0}
                    defaultValue={one(params, "minPrice")}
                    placeholder="0"
                  />
                </Field>
                <Field label="Max rent">
                  <Input
                    name="maxPrice"
                    type="number"
                    min={0}
                    defaultValue={one(params, "maxPrice")}
                    placeholder="Any"
                  />
                </Field>
              </div>
              <Field label="Bedrooms, at least">
                <Input
                  name="bedrooms"
                  type="number"
                  min={0}
                  max={20}
                  defaultValue={one(params, "bedrooms")}
                  placeholder="Any"
                />
              </Field>
              <Field label="Furnishing">
                <Select
                  name="furnishing"
                  defaultValue={one(params, "furnishing")}
                >
                  <option value="">Any</option>
                  {FURNISHINGS.map((f) => (
                    <option key={f} value={f}>
                      {FURNISHING_LABELS[f]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Parking">
                <Select name="parking" defaultValue={one(params, "parking")}>
                  <option value="">Any</option>
                  {PARKINGS.map((p) => (
                    <option key={p} value={p}>
                      {PARKING_LABELS[p]}
                    </option>
                  ))}
                </Select>
              </Field>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="petsAllowed"
                  value="true"
                  defaultChecked={one(params, "petsAllowed") === "true"}
                  className="size-4 accent-primary"
                />
                Pets allowed
              </label>
              <Field label="Sort by">
                <Select
                  name="sort"
                  defaultValue={one(params, "sort") || "newest"}
                >
                  <option value="newest">Newest first</option>
                  <option value="price_asc">Rent, low to high</option>
                  <option value="price_desc">Rent, high to low</option>
                </Select>
              </Field>
              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" className="flex-1">
                  Show places
                </Button>
                <Link
                  href="/listings"
                  className="text-sm font-medium underline underline-offset-4"
                >
                  Clear
                </Link>
              </div>
            </form>
          </Card>
        </FiltersToggle>

        <section>
          {!result.ok && (
            <Card className="border-danger/40 bg-danger-soft p-4 text-danger">
              {result.message}
            </Card>
          )}

          {result.ok && result.data.items.length === 0 && (
            <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <SearchX
                className="size-10 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="font-display text-xl font-semibold">
                No places match these filters
              </p>
              <p className="max-w-sm text-muted-foreground">
                Try a wider rent range or a different city.
              </p>
              <Link
                href="/listings"
                className={buttonVariants({ variant: "outline" })}
              >
                Clear filters
              </Link>
            </Card>
          )}

          {result.ok && result.data.items.length > 0 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.data.items.map((listing) => (
                  <ListingCardView key={listing.id} listing={listing} />
                ))}
              </div>

              {result.data.totalPages > 1 && (
                <nav
                  className="mt-8 flex items-center justify-center gap-4 text-sm"
                  aria-label="Pages"
                >
                  {result.data.page > 1 && (
                    <Link
                      href={pageHref(result.data.page - 1)}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
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
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Next <ChevronRight />
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
