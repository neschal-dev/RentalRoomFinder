import Link from "next/link";
import { Suspense } from "react";
import { ListingCardView } from "@/components/listing-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { fetchSearch } from "@/lib/server-data";
import { CITIES } from "@/lib/listings";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              Find a room, flat or house in {CITIES.slice(0, -1).join(", ")} and{" "}
              {CITIES.at(-1)}.
            </h1>
            <p className="mt-4 max-w-prose text-lg text-muted-foreground">
              Browse places posted by owners. Filter by rent, size and
              facilities, then see what is available.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {CITIES.map((city) => (
                <Link
                  key={city}
                  href={`/listings?city=${city}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>

          {/* A tiny search that sends the visitor to the full search page. */}
          <form
            method="GET"
            action="/listings"
            className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="font-display text-lg font-semibold">
              Start your search
            </p>
            <Field label="City">
              <Select name="city" defaultValue="">
                <option value="">All cities</option>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Highest rent you can pay, per month">
              <Input
                name="maxPrice"
                type="number"
                min={0}
                placeholder="For example, 15000"
              />
            </Field>
            <Button type="submit" size="lg" variant="accent" className="w-full">
              Show places
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Newly posted
          </h2>
          <Link
            href="/listings"
            className="text-sm font-medium underline underline-offset-4"
          >
            See all places
          </Link>
        </div>
        <Suspense
          fallback={<p className="text-muted-foreground">Loading places…</p>}
        >
          <Latest />
        </Suspense>
      </section>
    </main>
  );
}

async function Latest() {
  const result = await fetchSearch(new URLSearchParams({ sort: "newest" }));
  if (!result.ok) return <p className="text-danger">{result.message}</p>;
  if (result.data.items.length === 0) {
    return (
      <p className="text-muted-foreground">
        Nothing has been posted yet. Be the first to post a place.
      </p>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {result.data.items.slice(0, 6).map((l) => (
        <ListingCardView key={l.id} listing={l} />
      ))}
    </div>
  );
}
