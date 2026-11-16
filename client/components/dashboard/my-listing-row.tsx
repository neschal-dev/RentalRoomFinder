import Link from "next/link";
import { ImageOff, MapPin, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  STATUS_LABELS,
  formatDate,
  formatPrice,
  type ListingStatus,
  type MyListing,
} from "@/lib/listings";

const STATUS_TONE: Record<
  ListingStatus,
  "success" | "warning" | "neutral" | "danger"
> = {
  active: "success",
  pending_payment: "warning",
  expired: "neutral",
  hidden: "danger",
  removed: "neutral",
};

// One listing in the owner's dashboard. Pass `onDelete` to show the Delete button.
export function MyListingRow({
  listing,
  onDelete,
}: {
  listing: MyListing;
  onDelete?: (id: string) => void;
}) {
  const cover = listing.media.find((m) => m.mediaType === "image");

  return (
    <Card className="flex flex-col gap-4 p-3 sm:flex-row sm:items-center">
      <div className="h-32 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-20 sm:w-28">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-6" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{listing.title}</p>
          <Badge tone={STATUS_TONE[listing.status]}>
            {STATUS_LABELS[listing.status]}
          </Badge>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {listing.area}, {listing.city}
          </span>
        </p>
        <p className="mt-1 text-sm">
          <span className="font-semibold">
            {formatPrice(listing.rentPrice)}
          </span>
          <span className="text-muted-foreground"> a month</span>
          {listing.expiresAt && listing.status === "active" && (
            <span className="text-muted-foreground">
              {" "}
              · Live until {formatDate(listing.expiresAt)}
            </span>
          )}
          {listing.status === "expired" && listing.expiresAt && (
            <span className="text-muted-foreground">
              {" "}
              · Ended {formatDate(listing.expiresAt)}
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        {listing.status === "active" && (
          <Link
            href={`/listings/${listing.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View
          </Link>
        )}
        <Link
          href={`/account/listings/${listing.id}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil /> Edit
        </Link>
        {onDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(listing.id)}
          >
            <Trash2 /> Delete
          </Button>
        )}
      </div>
    </Card>
  );
}
