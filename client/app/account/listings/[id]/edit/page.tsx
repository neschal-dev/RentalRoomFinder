"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ListingForm } from "@/components/listing-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createApi } from "@/lib/api";
import { DEMO, sampleMine } from "@/lib/demo";
import type { MyListing } from "@/lib/listings";

// Loads the owner's listing, then shows the form filled in.
// The owner's list is used because it also contains listings that are not public yet.
export default function EditListingPage({
  params,
}: PageProps<"/account/listings/[id]/edit">) {
  const { id } = use(params);
  const { isLoaded, getToken } = useAuth();
  const [listing, setListing] = useState<MyListing | null>(
    DEMO ? (sampleMine().find((l) => l.id === id) ?? null) : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO || !isLoaded) return;
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
    <>
      <PageHeader
        title="Edit listing"
        description="Changes show on the public page as soon as you save."
      />
      {error && (
        <Card className="border-danger/40 bg-danger-soft p-4 text-danger">
          {error}
        </Card>
      )}
      {!listing && !error && <p className="text-muted-foreground">Loading…</p>}
      {listing && <ListingForm existing={listing} />}
    </>
  );
}
