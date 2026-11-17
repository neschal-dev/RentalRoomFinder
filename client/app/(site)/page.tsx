import { Suspense } from "react";
import { ListingRow } from "@/components/listing-row";
import { SearchBar } from "@/components/search-bar";
import { fetchSearch } from "@/lib/server-data";
import { CITIES } from "@/lib/listings";

// The front page: a search bar, then rows of places, newest first and then one row per city.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6">
      <h1 className="mx-auto mb-6 max-w-3xl text-balance text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Find a place to rent in {CITIES.slice(0, -1).join(", ")} and{" "}
        {CITIES.at(-1)}
      </h1>
      <div className="mx-auto max-w-4xl">
        <SearchBar />
      </div>

      <Suspense
        fallback={
          <p className="mt-10 text-muted-foreground">Loading places…</p>
        }
      >
        <Rows />
      </Suspense>
    </main>
  );
}

async function Rows() {
  // One request for the newest places and one per city, all at the same time.
  const [latest, ...byCity] = await Promise.all([
    fetchSearch(new URLSearchParams({ sort: "newest" })),
    ...CITIES.map((city) =>
      fetchSearch(new URLSearchParams({ city, sort: "newest" })),
    ),
  ]);

  if (!latest.ok) return <p className="mt-10 text-danger">{latest.message}</p>;
  if (latest.data.items.length === 0) {
    return (
      <p className="mt-10 text-muted-foreground">
        Nothing has been posted yet. Be the first to post a place.
      </p>
    );
  }

  return (
    <>
      <ListingRow
        title="Newly posted"
        href="/listings"
        listings={latest.data.items.slice(0, 10)}
      />
      {CITIES.map((city, i) => {
        const result = byCity[i];
        if (!result?.ok || result.data.items.length === 0) return null;
        return (
          <ListingRow
            key={city}
            title={`Places in ${city}`}
            href={`/listings?city=${city}`}
            listings={result.data.items.slice(0, 10)}
          />
        );
      })}
    </>
  );
}
