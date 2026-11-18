"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Building2, PlusCircle } from "lucide-react";
import { MyListingRow } from "@/components/dashboard/my-listing-row";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createApi } from "@/lib/api";
import { DEMO, sampleMine } from "@/lib/demo";
import type { MyListing } from "@/lib/listings";

// The owner's own listings, with edit and delete.
export default function MyListingsPage() {
  return (
    <>
      <PageHeader
        title="My listings"
        description="Everything you have posted, live or not."
        action={
          <Link
            href="/account/listings/new"
            className={buttonVariants({ variant: "accent" })}
          >
            <PlusCircle /> Post a place
          </Link>
        }
      />
      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense
        fallback={
          <p className="text-muted-foreground">Loading your listings…</p>
        }
      >
        <MyListings />
      </Suspense>
    </>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "success" | "warning";
  children: React.ReactNode;
}) {
  const color =
    tone === "success"
      ? "bg-success-soft text-success"
      : "bg-warning-soft text-warning";
  return (
    <p className={`mb-4 rounded-lg px-4 py-3 text-sm ${color}`}>{children}</p>
  );
}

function MyListings() {
  const { isLoaded, getToken } = useAuth();
  const search = useSearchParams();
  const [items, setItems] = useState<MyListing[] | null>(
    DEMO ? sampleMine() : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO || !isLoaded) return;
    createApi(getToken)
      .get<MyListing[]>("/listings/mine")
      .then((response) => setItems(response.data))
      .catch(() => setError("Could not load your listings."));
  }, [isLoaded, getToken]);

  async function remove(id: string) {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      if (!DEMO) await createApi(getToken).delete(`/listings/${id}`);
      setItems((list) => list?.filter((l) => l.id !== id) ?? null);
    } catch {
      setError("Could not delete the listing. Try again.");
    }
  }

  const created = search.get("created");

  return (
    <>
      {created === "active" && (
        <Notice tone="success">
          Your listing is live. It stays visible for 30 days.
        </Notice>
      )}
      {created === "pending_payment" && (
        <Notice tone="warning">
          Your listing is saved but not live yet. Pay NPR 200 with eSewa to
          publish it for 30 days.
        </Notice>
      )}
      {search.get("saved") && <Notice tone="success">Changes saved.</Notice>}

      {error && (
        <Card className="mb-4 border-danger/40 bg-danger-soft p-4 text-danger">
          {error}
        </Card>
      )}
      {!items && !error && (
        <p className="text-muted-foreground">Loading your listings…</p>
      )}

      {items && items.length === 0 && (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Building2
            className="size-10 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="font-display text-xl font-semibold">
            You have not posted a place yet
          </p>
          <p className="max-w-sm text-muted-foreground">
            Your first post is free once your phone number is verified.
          </p>
          <Link
            href="/account/listings/new"
            className={buttonVariants({ variant: "accent" })}
          >
            <PlusCircle /> Post your first place
          </Link>
        </Card>
      )}

      <ul className="space-y-3">
        {items?.map((l) => (
          <MyListingRow key={l.id} listing={l} onDelete={remove} />
        ))}
      </ul>
    </>
  );
}
