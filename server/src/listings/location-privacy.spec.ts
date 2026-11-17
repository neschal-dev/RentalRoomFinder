import { describe, expect, it } from 'vitest';
import {
  APPROX_RADIUS_METERS,
  approximatePoint,
  publicLocation,
} from './location-privacy.js';

const REAL = { latitude: 27.6298, longitude: 85.5218 };

function metersBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const north = (a.latitude - b.latitude) * 111_320;
  const east =
    (a.longitude - b.longitude) *
    111_320 *
    Math.cos((b.latitude * Math.PI) / 180);
  return Math.hypot(north, east);
}

describe('approximatePoint', () => {
  it('gives the same answer every time for the same listing', () => {
    const first = approximatePoint('listing-1', REAL.latitude, REAL.longitude);
    const second = approximatePoint('listing-1', REAL.latitude, REAL.longitude);
    expect(second).toEqual(first);
  });

  it('always keeps the real spot inside the circle, but away from its centre', () => {
    for (let i = 0; i < 200; i++) {
      const moved = approximatePoint(
        `listing-${i}`,
        REAL.latitude,
        REAL.longitude,
      );
      const distance = metersBetween(moved, REAL);
      expect(distance).toBeGreaterThan(APPROX_RADIUS_METERS * 0.19);
      expect(distance).toBeLessThan(APPROX_RADIUS_METERS * 0.71);
    }
  });

  it('moves different listings in different directions', () => {
    const points = new Set(
      Array.from({ length: 20 }, (_, i) =>
        approximatePoint(
          `listing-${i}`,
          REAL.latitude,
          REAL.longitude,
        ).latitude.toFixed(6),
      ),
    );
    expect(points.size).toBeGreaterThan(15);
  });
});

describe('publicLocation', () => {
  it('returns the real point only when the owner chose exact', () => {
    const exact = publicLocation({ id: 'a', ...REAL, showExactLocation: true });
    expect(exact).toMatchObject({ ...REAL, locationPrecision: 'exact' });

    const hidden = publicLocation({
      id: 'a',
      ...REAL,
      showExactLocation: false,
    });
    expect(hidden.latitude).not.toBe(REAL.latitude);
    expect(hidden.locationPrecision).toBe('area');
    expect(hidden.locationRadiusMeters).toBe(APPROX_RADIUS_METERS);
  });
});
