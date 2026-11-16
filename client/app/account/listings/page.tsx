"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createApi } from "@/lib/api";
import { STATUS_LABELS, formatRent, type MyListing } from "@/lib/listings";

// The owner's own listings, with edit and delete.
export default function MyListingsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My listings</h1>
        <Link
          href="/account/listings/new"
          className="flex h-10 items-center rounded-full bg-black px-5 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Post a place
        </Link>
      </div>
      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense fallback={<p>Loading…</p>}>
        <MyListings />
      </Suspense>
    </main>
  );
}

function MyListings() {
  const { isLoaded, getToken } = useAuth();
  const search = useSearchParams();
  const [items, setItems] = useState<MyListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    createApi(getToken)
      .get<MyListing[]>("/listings/mine")
      .then((response) => setItems(response.data))
      .catch(() => setError("Could not load your listings."));
  }, [isLoaded, getToken]);

  async function remove(id: string) {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      await createApi(getToken).delete(`/listings/${id}`);
      setItems((list) => list?.filter((l) => l.id !== id) ?? null);
    } catch {
      setError("Could not delete the listing. Please try again.");
    }
  }

  const created = search.get("created");

  return (
    <>
      {created === "active" && (
        <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Your listing is live. It stays visible for 30 days.
        </p>
      )}
      {created === "pending_payment" && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Your listing is saved but not live yet. Payment is needed to publish
          it, and online payment is coming soon.
        </p>
      )}
      {search.get("saved") && (
        <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Changes saved.
        </p>
      )}

      {error && <p className="text-red-600">{error}</p>}
      {!items && !error && <p>Loading…</p>}
      {items && items.length === 0 && (
        <p className="text-zinc-500">You have not posted anything yet.</p>
      )}

      <ul className="space-y-3">
        {items?.map((l) => (
          <li
            key={l.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-black/10 p-4 dark:border-white/15"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{l.title}</p>
              <p className="text-sm text-zinc-500">
                {formatRent(l.rentPrice)} · {l.area}, {l.city}
              </p>
              <p className="mt-1 text-xs">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                  {STATUS_LABELS[l.status]}
                </span>
                {l.expiresAt && l.status === "active" && (
                  <span className="ml-2 text-zinc-500">
                    until {l.expiresAt.slice(0, 10)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 gap-4 text-sm">
              {l.status === "active" && (
                <Link href={`/listings/${l.id}`} className="underline">
                  View
                </Link>
              )}
              <Link
                href={`/account/listings/${l.id}/edit`}
                className="underline"
              >
                Edit
              </Link>
              <button
                onClick={() => remove(l.id)}
                className="cursor-pointer text-red-600 underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
