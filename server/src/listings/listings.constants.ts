// Cities where FindMeAPlace is available in the first release.
// To open a new city, add its name here. Nothing else needs to change.
export const SUPPORTED_CITIES = ['Kathmandu', 'Bhaktapur', 'Banepa'] as const;

// The choices an owner can pick. The database accepts exactly these values.
export const PROPERTY_TYPES = ['room', 'flat', 'house'] as const;
export const FURNISHINGS = ['none', 'semi', 'full'] as const;
export const PARKINGS = ['none', 'bike', 'car', 'both'] as const;
export const MEDIA_TYPES = ['image', 'video'] as const;
export const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc'] as const;

// How long a listing stays visible after it becomes active.
export const LISTING_DURATION_DAYS = 30;

// Search results per page.
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;
// Deep pages make the database skip many rows. Nobody browses past this.
export const MAX_PAGE = 500;

// Fields an owner may clear by sending null on PATCH. Every other field must keep a value.
export const CLEARABLE_FIELDS = ['sizeSqft'];

// The most listings "my listings" returns in one go.
export const MY_LISTINGS_LIMIT = 100;

// Rough box around Nepal. Catches swapped or nonsense coordinates early.
export const NEPAL_BOUNDS = {
  minLatitude: 26.3,
  maxLatitude: 30.5,
  minLongitude: 80.0,
  maxLongitude: 88.3,
} as const;

// A listing needs at least this many photos. Videos are optional and do not count.
export const MIN_PHOTOS = 3;
