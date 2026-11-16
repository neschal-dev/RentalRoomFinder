import { IsIn } from 'class-validator';
import { MEDIA_TYPES } from '../../listings/listings.constants.js';
import type { MediaType } from '../../listings/types/media-type.type.js';

// The body of POST /media/signature: what kind of file the browser wants to upload.
export class CreateUploadSignatureDto {
  @IsIn(MEDIA_TYPES)
  mediaType: MediaType;
}
