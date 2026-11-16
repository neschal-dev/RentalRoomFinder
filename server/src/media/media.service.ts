import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { env } from '../env.js';
import type { MediaType } from '../listings/types/media-type.type.js';

// All our photos and videos go into this folder of the Cloudinary account.
export const UPLOAD_FOLDER = 'findmeaplace/listings';

@Injectable()
export class MediaService {
  // Gives the browser a one-time permission to upload ONE file straight to Cloudinary.
  //
  // How the signature works: we put the upload settings (folder, timestamp) in a text,
  // add our API secret, and hash it. Cloudinary repeats the same calculation with its copy
  // of the secret. If the results match, the settings were not changed on the way.
  // The secret itself never leaves the server.
  createUploadSignature(mediaType: MediaType) {
    const timestamp = Math.floor(Date.now() / 1000);

    // Cloudinary wants the settings sorted by name, written as name=value joined by &.
    const toSign = `folder=${UPLOAD_FOLDER}&timestamp=${timestamp}`;
    const signature = createHash('sha1')
      .update(toSign + env.cloudinary.apiSecret)
      .digest('hex');

    return {
      // Where the browser sends the file. Photos and videos use different addresses.
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/${mediaType}/upload`,
      apiKey: env.cloudinary.apiKey, // public, safe to show
      timestamp,
      folder: UPLOAD_FOLDER,
      signature,
    };
  }
}
