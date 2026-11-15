import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { env } from '../env.js';
import { MediaService, UPLOAD_FOLDER } from './media.service.js';

describe('MediaService.createUploadSignature', () => {
  const service = new MediaService();

  it('signs the folder and timestamp with the secret, and never returns the secret', () => {
    const result = service.createUploadSignature('image');

    const expected = createHash('sha1')
      .update(
        `folder=${UPLOAD_FOLDER}&timestamp=${result.timestamp}${env.cloudinary.apiSecret}`,
      )
      .digest('hex');
    expect(result.signature).toBe(expected);
    expect(result.folder).toBe(UPLOAD_FOLDER);
    expect(JSON.stringify(result)).not.toContain(env.cloudinary.apiSecret);
  });

  it('uses a different upload address for photos and videos', () => {
    expect(service.createUploadSignature('image').uploadUrl).toMatch(
      /\/image\/upload$/,
    );
    expect(service.createUploadSignature('video').uploadUrl).toMatch(
      /\/video\/upload$/,
    );
  });
});
