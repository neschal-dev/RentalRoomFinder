import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Carousel, CarouselItem } from "@/components/carousel";
import { ListingCardView } from "@/components/listing-card";
import type { ListingCard } from "@/lib/listings";

// A titled row of places that scrolls sideways, for example "Popular in Banepa".
export function ListingRow({
  title,
  href,
  listings,
}: {
  title: string;
  href: string;
  listings: ListingCard[];
}) {
  return (
    <section className="mt-10">
      <Link
        href={href}
        className="group mb-4 inline-flex items-center gap-1 font-display text-xl font-semibold tracking-tight sm:text-2xl"
      >
        {title}
        <ChevronRight
          className="size-5 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
      <Carousel>
        {listings.map((listing) => (
          <CarouselItem key={listing.id}>
            <ListingCardView listing={listing} />
          </CarouselItem>
        ))}
      </Carousel>
    </section>
  );
}
