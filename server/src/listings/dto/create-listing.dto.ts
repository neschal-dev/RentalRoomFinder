import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { trim } from '../../common/transformers/trim.transformer.js';
import {
  FURNISHINGS,
  NEPAL_BOUNDS,
  PARKINGS,
  PROPERTY_TYPES,
  SUPPORTED_CITIES,
} from '../listings.constants.js';
import type { City } from '../types/city.type.js';
import type { Furnishing } from '../types/furnishing.type.js';
import type { Parking } from '../types/parking.type.js';
import type { PropertyType } from '../types/property-type.type.js';
import { ListingMediaDto } from './listing-media.dto.js';

// The data an owner sends to post a property.
// Fields not listed here (status, ownerId, fair price ...) are rejected,
// because the global ValidationPipe is set to forbid unknown fields.
export class CreateListingDto {
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title: string;

  @Transform(trim)
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description: string;

  @IsIn(PROPERTY_TYPES)
  propertyType: PropertyType;

  @IsInt()
  @Min(0)
  @Max(20)
  bedrooms: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  sizeSqft?: number;

  @IsOptional()
  @IsIn(FURNISHINGS)
  furnishing?: Furnishing;

  @IsOptional()
  @IsIn(PARKINGS)
  parking?: Parking;

  @IsOptional()
  @IsBoolean()
  smokingAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  alcoholAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  petsAllowed?: boolean;

  // Monthly rent in NPR.
  @IsInt()
  @Min(500)
  @Max(10_000_000)
  rentPrice: number;

  @IsIn(SUPPORTED_CITIES)
  city: City;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  area: string;

  @IsNumber()
  @Min(NEPAL_BOUNDS.minLatitude)
  @Max(NEPAL_BOUNDS.maxLatitude)
  latitude: number;

  @IsNumber()
  @Min(NEPAL_BOUNDS.minLongitude)
  @Max(NEPAL_BOUNDS.maxLongitude)
  longitude: number;

  // false (the default): renters see a circle of about 400 m around the spot.
  // true: renters see the exact pin.
  @IsOptional()
  @IsBoolean()
  showExactLocation?: boolean;

  // A calendar date like "2026-12-01". The strict check also rejects dates that do not
  // exist, such as "2026-02-31".
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'availableFrom must be a date like 2026-12-01',
  })
  @IsISO8601({ strict: true })
  availableFrom: string;

  // Ids of facilities (WiFi, water, ...) the property has.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  facilityIds?: string[];

  // Photos and videos, already uploaded to Cloudinary. At least 3 photos are needed (see media-rules.ts).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => ListingMediaDto)
  media?: ListingMediaDto[];
}
