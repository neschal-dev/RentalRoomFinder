import type { SUPPORTED_CITIES } from '../listings.constants.js';

export type City = (typeof SUPPORTED_CITIES)[number];
