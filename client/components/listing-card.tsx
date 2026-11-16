import Link from "next/link";
import { BedDouble, ImageOff, MapPin, Ruler, Sofa } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  FURNISHING_LABELS,
  capitalize,
  formatPrice,
  type ListingCard,
} from "@/lib/listings";

// One result on the search page.
export function ListingCardView({ listing }: { listing: ListingCard }) {
  const hasPhoto = listing.cover?.mediaType === "image";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {hasPhoto ? (
          // Photos come from any website the owner pastes, so a plain <img> is used.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover!.url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden="true" />
          </div>
        )}
        <Badge tone="solid" className="absolute left-3 top-3">
          {capitalize(listing.propertyType)}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-display text-xl font-semibold tracking-tight">
          {formatPrice(listing.rentPrice)}
          <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">
            a month
          </span>
        </p>
        <p className="line-clamp-1 font-medium">{listing.title}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">
            {listing.area}, {listing.city}
          </span>
        </p>
        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <BedDouble className="size-4" aria-hidden="true" />
            {listing.bedrooms} {listing.bedrooms === 1 ? "bedroom" : "bedrooms"}
          </li>
          {listing.sizeSqft && (
            <li className="flex items-center gap-1.5">
              <Ruler className="size-4" aria-hidden="true" />
              {listing.sizeSqft} sq ft
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <Sofa className="size-4" aria-hidden="true" />
            {FURNISHING_LABELS[listing.furnishing]}
          </li>
        </ul>
      </div>
    </Link>
  );
}
