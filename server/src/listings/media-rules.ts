import { BadRequestException } from '@nestjs/common';
import { MIN_PHOTOS } from './listings.constants.js';

type MediaItem = { mediaType: 'image' | 'video' };

// Checks the photos and videos of a listing. Throws 400 with a plain message when a rule is broken.
//   1. At least MIN_PHOTOS photos. Videos are optional and do not count towards this.
//   2. The first item is the cover shown on search cards, so it must be a photo, not a video.
export function assertMediaRules(media: readonly MediaItem[]): void {
  const photos = media.filter((item) => item.mediaType === 'image').length;
  if (photos < MIN_PHOTOS) {
    throw new BadRequestException(
      `Add at least ${MIN_PHOTOS} photos (you have ${photos}). Videos are optional.`,
    );
  }
  if (media[0]?.mediaType !== 'image') {
    throw new BadRequestException(
      'The first item is the cover, so it must be a photo, not a video.',
    );
  }
}
