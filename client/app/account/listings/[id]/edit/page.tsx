"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ListingForm } from "@/components/listing-form";
import { createApi } from "@/lib/api";
import type { MyListing } from "@/lib/listings";

// Loads the owner's listing, then shows the form filled in.
// The owner's list is used because it also contains listings that are not public yet.
export default function EditListingPage({
  params,
}: PageProps<"/account/listings/[id]/edit">) {
  const { id } = use(params);
  const { isLoaded, getToken } = useAuth();
  const [listing, setListing] = useState<MyListing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    createApi(getToken)
      .get<MyListing[]>("/listings/mine")
      .then((response) => {
        const found = response.data.find((l) => l.id === id);
        if (found) setListing(found);
        else setError("This listing was not found in your listings.");
      })
      .catch(() => setError("Could not load your listing."));
  }, [isLoaded, getToken, id]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Edit listing</h1>
      {error && <p className="text-red-600">{error}</p>}
      {!listing && !error && <p>Loading…</p>}
      {listing && <ListingForm existing={listing} />}
    </main>
  );
}
