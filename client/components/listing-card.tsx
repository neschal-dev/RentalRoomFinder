import Link from "next/link";
import { ImageOff } from "lucide-react";
import {
  FURNISHING_LABELS,
  capitalize,
  formatPrice,
  isNew,
  type ListingCard,
} from "@/lib/listings";

// One place in a grid or a row. The photo does the talking: no box around the card,
// just the picture and three short lines.
//   Room in Banepa Bazaar
//   1 bedroom · Unfurnished
//   Rs 9,500 a month
export function ListingCardView({ listing }: { listing: ListingCard }) {
  const hasPhoto = listing.cover?.mediaType === "image";

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-muted">
        {hasPhoto ? (
          // Photos come from any website the owner pastes, so a plain <img> is used.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover!.url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden="true" />
          </div>
        )}
        {isNew(listing.createdAt) && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-sm">
            New
          </span>
        )}
      </div>

      <div className="mt-3 space-y-0.5">
        <p className="line-clamp-1 font-semibold">
          {capitalize(listing.propertyType)} in {listing.area}
        </p>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {listing.bedrooms} {listing.bedrooms === 1 ? "bedroom" : "bedrooms"} ·{" "}
          {FURNISHING_LABELS[listing.furnishing]}
        </p>
        <p className="pt-1 text-sm">
          <span className="font-semibold">
            {formatPrice(listing.rentPrice)}
          </span>
          <span className="text-muted-foreground"> a month</span>
        </p>
      </div>
    </Link>
  );
}
