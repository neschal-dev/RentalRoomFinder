// The demo switch and the code that answers like the server, using the sample data.
import { DEMO_USER_ID, getSampleListings } from "./sample-listings";
import type { ListingDetail, MyListing, SearchResponse } from "./listings";

// true when client/.env.local has NEXT_PUBLIC_DEMO_DATA=true
export const DEMO = process.env.NEXT_PUBLIC_DEMO_DATA === "true";

export const DEMO_ME = {
  id: DEMO_USER_ID,
  role: "user" as const,
  phoneVerified: true,
  freePostUsed: false,
};

const PAGE_SIZE = 12;

// Same rules as the server: only live, not-expired listings are public.
function isPublic(l: MyListing): boolean {
  return (
    l.status === "active" &&
    l.expiresAt !== null &&
    new Date(l.expiresAt) > new Date()
  );
}

// Same filters and sorting as GET /listings.
export function searchSample(query: URLSearchParams): SearchResponse {
  const num = (key: string) =>
    query.get(key) ? Number(query.get(key)) : undefined;
  const city = query.get("city");
  const area = query.get("area")?.toLowerCase();
  const type = query.get("propertyType");
  const furnishing = query.get("furnishing");
  const parking = query.get("parking");
  const [min, max, beds] = [num("minPrice"), num("maxPrice"), num("bedrooms")];
  const sort = query.get("sort") ?? "newest";
  const page = Math.max(1, num("page") ?? 1);

  const matches = getSampleListings()
    .filter(
      (l) =>
        isPublic(l) &&
        (!city || l.city === city) &&
        (!area || l.area.toLowerCase().includes(area)) &&
        (!type || l.propertyType === type) &&
        (min === undefined || l.rentPrice >= min) &&
        (max === undefined || l.rentPrice <= max) &&
        (beds === undefined || l.bedrooms >= beds) &&
        (!furnishing || l.furnishing === furnishing) &&
        (!parking || l.parking === parking) &&
        (query.get("petsAllowed") !== "true" || l.petsAllowed),
    )
    .sort((a, b) =>
      sort === "price_asc"
        ? a.rentPrice - b.rentPrice
        : sort === "price_desc"
          ? b.rentPrice - a.rentPrice
          : b.createdAt.localeCompare(a.createdAt),
    );

  const items = matches
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((l) => ({
      ...l,
      cover: l.media[0] ?? null,
    }));
  return {
    items,
    page,
    pageSize: PAGE_SIZE,
    total: matches.length,
    totalPages: Math.ceil(matches.length / PAGE_SIZE),
  };
}

export function sampleDetail(id: string): ListingDetail | null {
  const found = getSampleListings().find((l) => l.id === id);
  return found && isPublic(found) ? found : null;
}

// The logged-in demo user's own listings, in every status.
export function sampleMine(): MyListing[] {
  return getSampleListings().filter((l) => l.ownerId === DEMO_USER_ID);
}
