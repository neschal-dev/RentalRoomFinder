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

// Where the PUBLIC is told a listing is. "exact" is the real spot. "area" is a moved point
// with a radius, used when the owner did not want to show the exact spot.
export type PublicLocation = {
  locationPrecision: "exact" | "area";
  locationRadiusMeters: number | null;
};

// One card on the search page. Only the first photo is sent.
export type ListingCard = ListingFields &
  PublicLocation & { cover: Media | null };

// The public detail page.
export type ListingDetail = ListingFields &
  PublicLocation & {
    media: Media[];
    facilities: Facility[];
  };

// What the owner sees about their own listing (adds status and expiry).
export type MyListing = ListingDetail & {
  ownerId: string;
  status: ListingStatus;
  expiresAt: string | null;
  updatedAt: string;
  // The real point. Only the owner is sent this.
  latitude: number;
  longitude: number;
  showExactLocation: boolean;
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

// "Rs 9,500"
export function formatPrice(price: number): string {
  return `Rs ${price.toLocaleString("en-IN")}`;
}

// "2026-12-01" -> "1 Dec 2026". UTC is used so the day never shifts with the time zone.
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const FURNISHING_LABELS: Record<Furnishing, string> = {
  none: "Unfurnished",
  semi: "Semi-furnished",
  full: "Fully furnished",
};

export const PARKING_LABELS: Record<Parking, string> = {
  none: "No parking",
  bike: "Bike parking",
  car: "Car parking",
  both: "Bike and car parking",
};

// True when a listing was posted in the last 7 days.
export function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

// Photo and video rules. The server checks the same ones.
export const MIN_PHOTOS = 3;
export const MAX_MEDIA = 15;
