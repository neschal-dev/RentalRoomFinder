import type { WithFacilityLinks } from './interfaces/with-facility-links.interface.js';
import { publicLocation } from './location-privacy.js';

// What a stranger browsing the site may see about a listing.
// This is an allowlist: a column added to the database later stays private
// until someone adds it here on purpose.
const PUBLIC_KEYS = [
  'id',
  'title',
  'description',
  'propertyType',
  'bedrooms',
  'sizeSqft',
  'furnishing',
  'parking',
  'smokingAllowed',
  'alcoholAllowed',
  'petsAllowed',
  'rentPrice',
  'city',
  'area',
  'availableFrom',
  'createdAt',
] as const;

// On top of that, the owner sees the life-cycle fields of their own listing,
// the real coordinates, and whether they chose to show them.
const OWNER_EXTRA_KEYS = [
  'ownerId',
  'status',
  'expiresAt',
  'updatedAt',
  'latitude',
  'longitude',
  'showExactLocation',
] as const;

// The columns publicLocation needs.
type LocatedRow = {
  id: string;
  latitude: number;
  longitude: number;
  showExactLocation: boolean;
};

type PublicKey = (typeof PUBLIC_KEYS)[number];
type OwnerKey = PublicKey | (typeof OWNER_EXTRA_KEYS)[number];

// Copies only the listed keys. The unfinished fair-price and road-graph columns
// (benchmarkPrice, fairPriceLabel, nearestNodeId ...) are in neither list on purpose.
function pick<Row, Key extends keyof Row>(row: Row, keys: readonly Key[]) {
  const result = {} as Pick<Row, Key>;
  for (const key of keys) {
    result[key] = row[key];
  }
  return result;
}

// Turns the join rows into a plain list: facilities: [{ id, name }].
function flattenFacilities(row: WithFacilityLinks) {
  return row.facilities.flatMap((link) =>
    link.facility ? [link.facility] : [],
  );
}

// One card on the search page.
export function toPublicCard<
  Row extends Record<PublicKey, unknown> & LocatedRow,
>(row: Row) {
  // The location goes through publicLocation, so a hidden spot never leaves the server.
  return { ...pick(row, PUBLIC_KEYS), ...publicLocation(row) };
}

// The public detail page: public fields plus photos and facilities.
export function toPublicDetail<
  Row extends Record<PublicKey, unknown> &
    LocatedRow &
    WithFacilityLinks & { media: unknown },
>(row: Row) {
  return {
    ...pick(row, PUBLIC_KEYS),
    ...publicLocation(row),
    media: row.media,
    facilities: flattenFacilities(row),
  };
}

// The owner's own view of a listing (create, update, "my listings").
export function toOwnerView<
  Row extends Record<OwnerKey, unknown> &
    WithFacilityLinks & { media: unknown },
>(row: Row) {
  // A listing is saved as "active" until its 30 days run out, and nothing flips it afterwards.
  // The owner should see the truth, so a listing past its end date is reported as "expired".
  const endDate = row.expiresAt as { toString(): string } | null;
  const pastEnd =
    row.status === 'active' &&
    endDate !== null &&
    new Date(endDate.toString()).getTime() <= Date.now();

  return {
    ...pick(row, [...PUBLIC_KEYS, ...OWNER_EXTRA_KEYS]),
    ...(pastEnd && { status: 'expired' as const }),
    media: row.media,
    facilities: flattenFacilities(row),
  };
}
