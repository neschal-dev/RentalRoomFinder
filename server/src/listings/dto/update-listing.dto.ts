import { PartialType } from '@nestjs/mapped-types';
import { CreateListingDto } from './create-listing.dto.js';

// Editing a listing: the same fields and rules as creating one, but every field is optional.
// The owner sends only what changed.
export class UpdateListingDto extends PartialType(CreateListingDto) {}
