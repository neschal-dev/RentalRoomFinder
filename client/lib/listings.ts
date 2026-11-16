// Types and small helpers for listings. They mirror what the NestJS server sends.

export const CITIES = ["Kathmandu", "Bhaktapur", "Banepa"] as const;
export const PROPERTY_TYPES = ["room", "flat", "house"] as const;
export const FURNISHINGS = ["none", "semi", "full"] as const;
export const PARKINGS = ["none", "bike", "car", "both"] as const;

export type City = (typeof CITIES)[number];
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type Furnishing = (typeof FURNISHINGS)[number];
export type Parking = (typeof PARKINGS)[number];
export type MediaType = "image" | "video";
export type ListingStatus =
  "pending_payment" | "active" | "expired" | "hidden" | "removed";

export type Media = { id: string; url: string; mediaType: MediaType };
export type Facility = { id: string; name: string };

// Fields every listing shows, public or not.
export type ListingFields = {
  id: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  bedrooms: number;
  sizeSqft: number | null;
  furnishing: Furnishing;
  parking: Parking;
  smokingAllowed: boolean;
  alcoholAllowed: boolean;
  petsAllowed: boolean;
  rentPrice: number;
  city: City;
  area: string;
  latitude: number;
  longitude: number;
  availableFrom: string; // "2026-12-01"
  createdAt: string;
};

// One card on the search page. Only the first photo is sent.
export type ListingCard = ListingFields & { cover: Media | null };

// The public detail page.
export type ListingDetail = ListingFields & {
  media: Media[];
  facilities: Facility[];
};

// What the owner sees about their own listing (adds status and expiry).
export type MyListing = ListingDetail & {
  ownerId: string;
  status: ListingStatus;
  expiresAt: string | null;
  updatedAt: string;
};

// GET /listings
export type SearchResponse = {
  items: ListingCard[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// "Rs 12,000 / month"
export function formatRent(price: number): string {
  return `Rs ${price.toLocaleString("en-IN")} / month`;
}

// "flat" -> "Flat"
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const STATUS_LABELS: Record<ListingStatus, string> = {
  pending_payment: "Waiting for payment",
  active: "Live",
  expired: "Expired",
  hidden: "Hidden",
  removed: "Removed",
};

// Centre of each city. The listing form starts from these coordinates
// until the map picker exists.
export const CITY_CENTERS: Record<
  City,
  { latitude: number; longitude: number }
> = {
  Kathmandu: { latitude: 27.7172, longitude: 85.324 },
  Bhaktapur: { latitude: 27.671, longitude: 85.4298 },
  Banepa: { latitude: 27.6298, longitude: 85.5214 },
};

// The server answers validation errors as { message: string[] } or { message: string }.
// This turns either into a list of lines to show.
export function errorLines(error: unknown): string[] {
  const data = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.map(String);
  if (typeof message === "string") return [message];
  return ["Could not reach the server. Please try again."];
}
