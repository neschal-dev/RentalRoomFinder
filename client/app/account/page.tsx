"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { BadgeCheck, Building2, Clock3, Gift, PlusCircle } from "lucide-react";
import { MyListingRow } from "@/components/dashboard/my-listing-row";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createApi, type MeResponse } from "@/lib/api";
import { DEMO, DEMO_ME, sampleMine } from "@/lib/demo";
import type { MyListing } from "@/lib/listings";

// Dashboard home: a few numbers about the account and the latest listings.
export default function OverviewPage() {
  const { isLoaded, getToken } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(DEMO ? DEMO_ME : null);
  const [listings, setListings] = useState<MyListing[] | null>(
    DEMO ? sampleMine() : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO || !isLoaded) return;
    const api = createApi(getToken);
    Promise.all([
      api.get<MeResponse>("/me"),
      api.get<MyListing[]>("/listings/mine"),
    ])
      .then(([meResponse, listingsResponse]) => {
        setMe(meResponse.data);
        setListings(listingsResponse.data);
      })
      .catch(() =>
        setError("Could not reach the server, or the login was rejected."),
      );
  }, [isLoaded, getToken]);

  const live = listings?.filter((l) => l.status === "active").length ?? 0;
  const waiting =
    listings?.filter((l) => l.status === "pending_payment").length ?? 0;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Your listings and account at a glance."
        action={
          <Link
            href="/account/listings/new"
            className={buttonVariants({ variant: "accent" })}
          >
            <PlusCircle /> Post a place
          </Link>
        }
      />

      {error && (
        <Card className="mb-6 border-danger/40 bg-danger-soft p-4 text-danger">
          {error}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<Building2 />}
          label="Live now"
          value={listings ? String(live) : "…"}
        />
        <Stat
          icon={<Clock3 />}
          label="Waiting for payment"
          value={listings ? String(waiting) : "…"}
        />
        <Stat
          icon={<Gift />}
          label="Free first post"
          value={me ? (me.freePostUsed ? "Used" : "Available") : "…"}
        />
        <Stat
          icon={<BadgeCheck />}
          label="Phone number"
          value={me ? (me.phoneVerified ? "Verified" : "Not verified") : "…"}
        />
      </div>

      {me && !me.phoneVerified && (
        <p className="mt-4 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          Verify your phone number in your account settings to get your first
          post free.
        </p>
      )}

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">
            Latest listings
          </h2>
          <Link
            href="/account/listings"
            className="text-sm font-medium underline underline-offset-4"
          >
            See all
          </Link>
        </div>
        {listings && listings.length === 0 && (
          <Card className="p-6 text-muted-foreground">
            You have not posted anything yet.
          </Card>
        )}
        <ul className="space-y-3">
          {listings?.slice(0, 3).map((l) => (
            <MyListingRow key={l.id} listing={l} />
          ))}
        </ul>
      </section>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground [&_svg]:size-4">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
        {value}
      </p>
    </Card>
  );
}
