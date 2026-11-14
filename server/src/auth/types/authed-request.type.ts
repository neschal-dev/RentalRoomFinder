import type { Request } from 'express';
import type { LocalUser } from './local-user.type.js';

// A normal request plus the logged-in user that ClerkAuthGuard attaches to it.
export type AuthedRequest = Request & { currentUser: LocalUser };
