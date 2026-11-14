import { z } from 'zod';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  NEPAL_BOUNDS,
  SUPPORTED_CITIES,
} from './listings.constants.js';

const propertyTypes = ['room', 'flat', 'house'] as const;
const furnishings = ['none', 'semi', 'full'] as const;
const parkings = ['none', 'bike', 'car', 'both'] as const;

// ---------------------------------------------------------------------------
// Create / update a listing
// ---------------------------------------------------------------------------

// Every field the owner can send. Anything else (status, ownerId, fair price ...)
// is rejected, because only the server may set those.
// Optional fields have no default here on purpose: defaults are applied in the service,
// so the same schema can be reused for partial updates without overwriting saved values.
export const createListingSchema = z.strictObject({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),

  propertyType: z.enum(propertyTypes),
  bedrooms: z.int().min(0).max(20),
  sizeSqft: z.int().positive().max(100_000).optional(),
  furnishing: z.enum(furnishings).optional(),
  parking: z.enum(parkings).optional(),
  smokingAllowed: z.boolean().optional(),
  alcoholAllowed: z.boolean().optional(),
  petsAllowed: z.boolean().optional(),

  // Monthly rent in NPR.
  rentPrice: z.int().min(500).max(10_000_000),
  city: z.enum(SUPPORTED_CITIES),
  area: z.string().trim().min(2).max(80),
  latitude: z
    .number()
    .min(NEPAL_BOUNDS.minLatitude)
    .max(NEPAL_BOUNDS.maxLatitude),
  longitude: z
    .number()
    .min(NEPAL_BOUNDS.minLongitude)
    .max(NEPAL_BOUNDS.maxLongitude),

  // "2026-12-01"
  availableFrom: z.iso.date(),

  // Ids of facilities (WiFi, water, ...) the property has.
  facilityIds: z.array(z.uuid()).max(30).optional(),
  // Photos and videos, already uploaded somewhere. Upload itself comes in a later module.
  media: z
    .array(
      z.strictObject({
        url: z.url().max(2000),
        mediaType: z.enum(['image', 'video']),
      }),
    )
    .max(15)
    .optional(),
});

// Update: the same fields, all optional. Send only what changed.
export const updateListingSchema = createListingSchema.partial();

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const searchListingsSchema = z
  .object({
    city: z.enum(SUPPORTED_CITIES).optional(),
    // Part of the area name, e.g. "bane" finds "Banepa Bazaar".
    area: z.string().trim().min(1).max(80).optional(),
    propertyType: z.enum(propertyTypes).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    // At least this many bedrooms.
    bedrooms: z.coerce.number().int().min(0).max(20).optional(),
    furnishing: z.enum(furnishings).optional(),
    parking: z.enum(parkings).optional(),
    // "?petsAllowed=true" keeps only listings that allow pets.
    petsAllowed: z.stringbool().optional(),
    smokingAllowed: z.stringbool().optional(),
    alcoholAllowed: z.stringbool().optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    {
      message: 'minPrice must not be greater than maxPrice',
      path: ['minPrice'],
    },
  );

export type SearchListingsQuery = z.infer<typeof searchListingsSchema>;

// ---------------------------------------------------------------------------
// URL parameter
// ---------------------------------------------------------------------------

export const listingIdSchema = z.uuid();
