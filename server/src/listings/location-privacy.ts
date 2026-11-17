import { createHmac } from 'node:crypto';
import { env } from '../env.js';

// When an owner does not want to show the exact spot, renters see a circle of this radius.
export const APPROX_RADIUS_METERS = 400;

const METERS_PER_DEGREE_LATITUDE = 111_320;

// The fields this file needs from a listing row.
interface LocatedListing {
  id: string;
  latitude: number;
  longitude: number;
  showExactLocation: boolean;
}

// A number between 0 and 1 that is always the same for the same listing and `purpose`,
// and cannot be guessed without the server secret. It makes the shift below stable:
// if it were random on every request, someone could ask many times and average the answers
// to find the real spot.
function stableFraction(id: string, purpose: string): number {
  const digest = createHmac('sha256', env.clerkSecretKey)
    .update(`${purpose}:${id}`)
    .digest();
  return digest.readUInt32BE(0) / 0x1_0000_0000;
}

// Moves the point 80 to 280 metres in a fixed direction. The circle is drawn around the moved
// point, and it is big enough (400 m) that the real spot always lies inside it,
// but not at its centre.
export function approximatePoint(
  id: string,
  latitude: number,
  longitude: number,
) {
  const angle = stableFraction(id, 'angle') * 2 * Math.PI;
  const distance =
    APPROX_RADIUS_METERS * (0.2 + 0.5 * stableFraction(id, 'distance'));

  const metersNorth = distance * Math.cos(angle);
  const metersEast = distance * Math.sin(angle);
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180);

  return {
    latitude: latitude + metersNorth / METERS_PER_DEGREE_LATITUDE,
    longitude: longitude + metersEast / metersPerDegreeLongitude,
  };
}

// What the PUBLIC may know about where a listing is.
//   exact: the real point.
//   area:  a moved point plus a radius. The real point never leaves the server.
export function publicLocation(listing: LocatedListing) {
  if (listing.showExactLocation) {
    return {
      latitude: listing.latitude,
      longitude: listing.longitude,
      locationPrecision: 'exact' as const,
      locationRadiusMeters: null,
    };
  }
  return {
    ...approximatePoint(listing.id, listing.latitude, listing.longitude),
    locationPrecision: 'area' as const,
    locationRadiusMeters: APPROX_RADIUS_METERS,
  };
}
