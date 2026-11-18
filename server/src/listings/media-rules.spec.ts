import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertMediaRules } from './media-rules.js';

const image = { mediaType: 'image' as const };
const video = { mediaType: 'video' as const };

describe('assertMediaRules', () => {
  it('accepts three photos', () => {
    expect(() => assertMediaRules([image, image, image])).not.toThrow();
  });

  it('accepts three photos and a video after them', () => {
    expect(() => assertMediaRules([image, image, image, video])).not.toThrow();
  });

  it('accepts a video in the middle, as long as the cover is a photo', () => {
    expect(() => assertMediaRules([image, video, image, image])).not.toThrow();
  });

  it('rejects fewer than three photos', () => {
    expect(() => assertMediaRules([image, image])).toThrow(BadRequestException);
    expect(() => assertMediaRules([])).toThrow(BadRequestException);
  });

  it('does not count videos as photos', () => {
    expect(() => assertMediaRules([image, image, video, video])).toThrow(
      /at least 3 photos \(you have 2\)/,
    );
  });

  it('rejects a video as the cover', () => {
    expect(() => assertMediaRules([video, image, image, image])).toThrow(
      /cover/,
    );
  });
});
