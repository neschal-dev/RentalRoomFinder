import { IsIn, IsUrl, MaxLength } from 'class-validator';
import { MEDIA_TYPES } from '../listings.constants.js';
import type { MediaType } from '../types/media-type.type.js';

// One photo or video of a listing. It is already uploaded somewhere;
// we only store where to find it.
export class ListingMediaDto {
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2000)
  url: string;

  @IsIn(MEDIA_TYPES)
  mediaType: MediaType;
}
