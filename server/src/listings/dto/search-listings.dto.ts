import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { toBoolean } from '../../common/transformers/to-boolean.transformer.js';
import { trim } from '../../common/transformers/trim.transformer.js';
import {
  FURNISHINGS,
  MAX_PAGE_SIZE,
  PARKINGS,
  PROPERTY_TYPES,
  SORT_OPTIONS,
  SUPPORTED_CITIES,
} from '../listings.constants.js';
import type { City } from '../types/city.type.js';
import type { Furnishing } from '../types/furnishing.type.js';
import type { ListingSort } from '../types/listing-sort.type.js';
import type { Parking } from '../types/parking.type.js';
import type { PropertyType } from '../types/property-type.type.js';

// The query string of GET /listings, e.g. ?city=Banepa&maxPrice=15000&sort=price_asc
// Values in a query string are text, so numbers use @Type(() => Number)
// and true/false use @Transform(toBoolean). Missing values are filled in by the service.
export class SearchListingsDto {
  @IsOptional()
  @IsIn(SUPPORTED_CITIES)
  city?: City;

  // Part of the area name: "bazaar" finds "Banepa Bazaar".
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  area?: string;

  @IsOptional()
  @IsIn(PROPERTY_TYPES)
  propertyType?: PropertyType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  // At least this many bedrooms.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  bedrooms?: number;

  @IsOptional()
  @IsIn(FURNISHINGS)
  furnishing?: Furnishing;

  @IsOptional()
  @IsIn(PARKINGS)
  parking?: Parking;

  // "?petsAllowed=true" keeps only listings that allow pets.
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  petsAllowed?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  smokingAllowed?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  alcoholAllowed?: boolean;

  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort?: ListingSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}
