// SAMPLE DATA for looking at the pages without a database.
// Turned on by NEXT_PUBLIC_DEMO_DATA=true in client/.env.local. Delete this file and demo.ts
// when the real data is flowing; nothing else depends on them.
import type {
  Facility,
  Furnishing,
  ListingStatus,
  MyListing,
  Parking,
  PropertyType,
  City,
} from "./listings";

export const DEMO_USER_ID = "demo-me";

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) =>
  new Date(Date.now() + days * DAY).toISOString();

export const SAMPLE_FACILITIES: Facility[] = [
  "WiFi",
  "24h water",
  "Attached bathroom",
  "Hot water",
  "Balcony",
  "Rooftop access",
  "CCTV",
  "Near public transport",
].map((name, i) => ({ id: `fac-${i + 1}`, name }));

const pick = (...names: string[]) =>
  SAMPLE_FACILITIES.filter((f) => names.includes(f.name));

// A photo address that always gives the same picture for the same word.
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/900/675`;

type Row = {
  title: string;
  description: string;
  propertyType: PropertyType;
  bedrooms: number;
  sizeSqft: number | null;
  furnishing: Furnishing;
  parking: Parking;
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  rentPrice: number;
  city: City;
  area: string;
  latitude: number;
  longitude: number;
  availableInDays: number;
  facilities: string[];
  photos: string[];
  status?: ListingStatus;
  postedDaysAgo: number;
  mine?: boolean;
};

const ROWS: Row[] = [
  {
    title: "Sunny single room near Banepa Hospital",
    description:
      "A bright room on the second floor with a window facing the hills. Shared kitchen and a clean shared bathroom. Five minutes' walk to the bus park and the hospital. Suited to students or a hospital worker.",
    propertyType: "room",
    bedrooms: 1,
    sizeSqft: 140,
    furnishing: "none",
    parking: "bike",
    rentPrice: 6500,
    city: "Banepa",
    area: "Hospital Road",
    latitude: 27.6305,
    longitude: 85.5207,
    availableInDays: 5,
    facilities: ["WiFi", "24h water", "Near public transport"],
    photos: ["room-hills", "room-window", "room-kitchen"],
    postedDaysAgo: 2,
    mine: true,
  },
  {
    title: "Two-bedroom flat with balcony, Banepa Bazaar",
    description:
      "Second-floor flat in a quiet lane just off the main bazaar. Two bedrooms, a living room and a small balcony. The owner lives on the ground floor. Water supply is reliable all day.",
    propertyType: "flat",
    bedrooms: 2,
    sizeSqft: 650,
    furnishing: "semi",
    parking: "bike",
    petsAllowed: true,
    rentPrice: 16000,
    city: "Banepa",
    area: "Banepa Bazaar",
    latitude: 27.6298,
    longitude: 85.5214,
    availableInDays: 12,
    facilities: ["WiFi", "24h water", "Balcony", "Hot water"],
    photos: ["flat-living", "flat-balcony", "flat-bedroom"],
    postedDaysAgo: 6,
    mine: true,
  },
  {
    title: "Room for students, Chaukot Road",
    description:
      "Simple, clean room for students. Walking distance to two colleges. Rent includes water. Electricity is shared and split between tenants.",
    propertyType: "room",
    bedrooms: 1,
    sizeSqft: 120,
    furnishing: "none",
    parking: "none",
    rentPrice: 5000,
    city: "Banepa",
    area: "Chaukot Road",
    latitude: 27.6341,
    longitude: 85.5262,
    availableInDays: 3,
    facilities: ["24h water"],
    photos: ["student-room", "student-desk"],
    postedDaysAgo: 0,
    mine: true,
  },
  {
    title: "Furnished room with attached bathroom",
    description:
      "Furnished room with a bed, wardrobe and study desk, and its own bathroom with hot water. A good fit for someone who wants privacy and a short commute.",
    propertyType: "room",
    bedrooms: 1,
    sizeSqft: 160,
    furnishing: "full",
    parking: "bike",
    rentPrice: 9000,
    city: "Banepa",
    area: "Panauti Road",
    latitude: 27.6252,
    longitude: 85.5303,
    availableInDays: -10,
    facilities: ["WiFi", "Attached bathroom", "Hot water"],
    photos: ["furnished-room", "furnished-bath"],
    status: "active",
    postedDaysAgo: 40,
    mine: true,
  },
  {
    title: "Heritage-style flat near Bhaktapur Durbar Square",
    description:
      "A flat in a restored brick house with carved wooden windows, two minutes from Durbar Square. One large bedroom, a sitting room and a small kitchen. Quiet at night, lively by day.",
    propertyType: "flat",
    bedrooms: 1,
    sizeSqft: 480,
    furnishing: "full",
    parking: "none",
    rentPrice: 22000,
    city: "Bhaktapur",
    area: "Durbar Square",
    latitude: 27.6722,
    longitude: 85.4298,
    availableInDays: 20,
    facilities: ["WiFi", "24h water", "Hot water", "CCTV"],
    photos: ["heritage-flat", "heritage-window", "heritage-kitchen"],
    postedDaysAgo: 3,
  },
  {
    title: "Three-bedroom house with parking, Suryabinayak",
    description:
      "A family house with a small garden and a covered parking space for a car. Three bedrooms, two bathrooms and a rooftop with a view of the valley. Pets are welcome.",
    propertyType: "house",
    bedrooms: 3,
    sizeSqft: 1400,
    furnishing: "semi",
    parking: "both",
    petsAllowed: true,
    rentPrice: 48000,
    city: "Bhaktapur",
    area: "Suryabinayak",
    latitude: 27.6588,
    longitude: 85.4254,
    availableInDays: 30,
    facilities: ["WiFi", "24h water", "Rooftop access", "CCTV", "Hot water"],
    photos: ["family-house", "house-garden", "house-roof"],
    postedDaysAgo: 9,
  },
  {
    title: "Budget room in Kausaltar",
    description:
      "Small room on the ground floor of a family home. Shared bathroom. Close to the main road with buses to Kathmandu every few minutes.",
    propertyType: "room",
    bedrooms: 1,
    sizeSqft: 110,
    furnishing: "none",
    parking: "none",
    rentPrice: 7000,
    city: "Bhaktapur",
    area: "Kausaltar",
    latitude: 27.6845,
    longitude: 85.3678,
    availableInDays: 2,
    facilities: ["24h water", "Near public transport"],
    photos: ["budget-room"],
    postedDaysAgo: 1,
  },
  {
    title: "Two-bedroom flat in Thimi",
    description:
      "Third-floor flat with morning sun. Two bedrooms, a kitchen with a gas connection and a shared rooftop for drying clothes. Good for a small family or two friends.",
    propertyType: "flat",
    bedrooms: 2,
    sizeSqft: 700,
    furnishing: "none",
    parking: "bike",
    rentPrice: 15000,
    city: "Bhaktapur",
    area: "Thimi",
    latitude: 27.6811,
    longitude: 85.3881,
    availableInDays: 14,
    facilities: ["24h water", "Rooftop access", "Near public transport"],
    photos: ["thimi-flat", "thimi-kitchen"],
    postedDaysAgo: 12,
  },
  {
    title: "Modern flat in Baneshwor, fully furnished",
    description:
      "A modern two-bedroom flat on the fourth floor of a building with a lift. Fully furnished, with a washing machine, a fridge and fast WiFi. Five minutes from the main road.",
    propertyType: "flat",
    bedrooms: 2,
    sizeSqft: 850,
    furnishing: "full",
    parking: "bike",
    rentPrice: 35000,
    city: "Kathmandu",
    area: "Baneshwor",
    latitude: 27.6915,
    longitude: 85.3426,
    availableInDays: 7,
    facilities: ["WiFi", "24h water", "Hot water", "Balcony", "CCTV"],
    photos: ["baneshwor-flat", "baneshwor-living", "baneshwor-bed"],
    postedDaysAgo: 4,
  },
  {
    title: "Room in a shared house, Koteshwor",
    description:
      "One room in a shared house with three other working professionals. Shared kitchen and living room. Quiet household, no smoking indoors.",
    propertyType: "room",
    bedrooms: 1,
    sizeSqft: 130,
    furnishing: "semi",
    parking: "bike",
    rentPrice: 11000,
    city: "Kathmandu",
    area: "Koteshwor",
    latitude: 27.6786,
    longitude: 85.3493,
    availableInDays: 1,
    facilities: ["WiFi", "24h water", "Hot water"],
    photos: ["koteshwor-room", "koteshwor-kitchen"],
    postedDaysAgo: 5,
  },
  {
    title: "Spacious house in Maharajgunj with garden",
    description:
      "A large house in a quiet residential area near the embassies. Four bedrooms, a garden, a garage and a separate guard room. Suitable for a family or an office.",
    propertyType: "house",
    bedrooms: 4,
    sizeSqft: 2200,
    furnishing: "none",
    parking: "both",
    petsAllowed: true,
    rentPrice: 90000,
    city: "Kathmandu",
    area: "Maharajgunj",
    latitude: 27.7382,
    longitude: 85.3345,
    availableInDays: 45,
    facilities: ["24h water", "CCTV", "Rooftop access"],
    photos: ["maharajgunj-house", "mg-garden", "mg-living"],
    postedDaysAgo: 15,
  },
  {
    title: "Cozy studio near Thamel",
    description:
      "A compact studio with a kitchenette, ten minutes on foot from Thamel. Furnished and ready to move in. Best for one person who likes to be in the middle of things.",
    propertyType: "flat",
    bedrooms: 1,
    sizeSqft: 320,
    furnishing: "full",
    parking: "none",
    smokingAllowed: true,
    rentPrice: 24000,
    city: "Kathmandu",
    area: "Thamel",
    latitude: 27.7154,
    longitude: 85.3123,
    availableInDays: 10,
    facilities: ["WiFi", "Hot water", "Near public transport"],
    photos: ["thamel-studio", "thamel-view"],
    postedDaysAgo: 8,
  },
  {
    title: "Affordable room in Chabahil",
    description:
      "Plain, clean room close to Chabahil chowk. Shared bathroom. Landlord is friendly and the neighbourhood is safe for late returns.",
    propertyType: "room",
    bedrooms: 1,
    sizeSqft: 115,
    furnishing: "none",
    parking: "none",
    rentPrice: 8000,
    city: "Kathmandu",
    area: "Chabahil",
    latitude: 27.7183,
    longitude: 85.3463,
    availableInDays: 4,
    facilities: ["24h water", "Near public transport"],
    photos: ["chabahil-room"],
    postedDaysAgo: 7,
  },
  {
    title: "Two-bedroom flat in Kalanki",
    description:
      "Bright flat on the top floor with a private terrace. Two bedrooms and a modern kitchen. Close to the ring road and long-distance buses.",
    propertyType: "flat",
    bedrooms: 2,
    sizeSqft: 760,
    furnishing: "semi",
    parking: "bike",
    rentPrice: 20000,
    city: "Kathmandu",
    area: "Kalanki",
    latitude: 27.6935,
    longitude: 85.2813,
    availableInDays: 18,
    facilities: ["WiFi", "24h water", "Balcony", "Rooftop access"],
    photos: ["kalanki-flat", "kalanki-terrace"],
    postedDaysAgo: 11,
  },
];

// Built on first use (not when the file loads), because the dates depend on today.
let cached: MyListing[] | null = null;
export function getSampleListings(): MyListing[] {
  cached ??= buildSamples();
  return cached;
}

function buildSamples(): MyListing[] {
  return ROWS.map((row, index) => {
    const status: ListingStatus = row.status ?? "active";
    // The fourth sample is a live listing whose 30 days ran out, so the dashboard can show "Expired".
    const expired = row.availableInDays === -10;
    return {
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      ownerId: row.mine ? DEMO_USER_ID : `owner-${index}`,
      title: row.title,
      description: row.description,
      propertyType: row.propertyType,
      bedrooms: row.bedrooms,
      sizeSqft: row.sizeSqft,
      furnishing: row.furnishing,
      parking: row.parking,
      smokingAllowed: row.smokingAllowed ?? false,
      alcoholAllowed: false,
      petsAllowed: row.petsAllowed ?? false,
      rentPrice: row.rentPrice,
      city: row.city,
      area: row.area,
      latitude: row.latitude,
      longitude: row.longitude,
      // A mix, so the demo shows both a pin and a circle.
      showExactLocation: index % 3 === 0,
      locationPrecision: index % 3 === 0 ? "exact" : "area",
      locationRadiusMeters: index % 3 === 0 ? null : 400,
      availableFrom: daysFromNow(Math.max(row.availableInDays, 0)).slice(0, 10),
      createdAt: daysFromNow(-row.postedDaysAgo),
      updatedAt: daysFromNow(-row.postedDaysAgo),
      status: expired ? "expired" : status,
      expiresAt: daysFromNow(expired ? -2 : 30 - row.postedDaysAgo),
      media: row.photos.map((seed, i) => ({
        id: `${index}-${i}`,
        url: photo(seed),
        mediaType: "image" as const,
      })),
      facilities: pick(...row.facilities),
    };
  });
}
