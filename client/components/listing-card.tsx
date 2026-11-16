import Link from "next/link";
import { capitalize, formatRent, type ListingCard } from "@/lib/listings";

// One result on the search page.
export function ListingCardView({ listing }: { listing: ListingCard }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block overflow-hidden rounded-lg border border-black/10 transition hover:shadow-md dark:border-white/15"
    >
      {listing.cover && listing.cover.mediaType === "image" ? (
        // Photos come from any website the owner pastes, so a plain <img> is used.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.cover.url}
          alt=""
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="flex h-44 items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
          No photo
        </div>
      )}
      <div className="space-y-1 p-4">
        <p className="font-semibold">{formatRent(listing.rentPrice)}</p>
        <p className="line-clamp-1">{listing.title}</p>
        <p className="text-sm text-zinc-500">
          {capitalize(listing.propertyType)} · {listing.bedrooms} bed ·{" "}
          {listing.area}, {listing.city}
        </p>
      </div>
    </Link>
  );
}
