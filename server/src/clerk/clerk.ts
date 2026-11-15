import { createClerkClient } from '@clerk/express';
import { env } from '../env.js';

// Settings that clerkMiddleware (main.ts) and the Clerk client share.
export const clerkConfig = {
  publishableKey: env.clerkPublishableKey,
  secretKey: env.clerkSecretKey,
  // Only tokens issued for our own Next.js app are accepted.
  // This is what makes the cross-origin (3001 -> 3000) setup safe.
  authorizedParties: [env.clientUrl],
};

// Used to ask Clerk for details about a user (for example, is their phone verified).
export const clerk = createClerkClient({
  publishableKey: clerkConfig.publishableKey,
  secretKey: clerkConfig.secretKey,
});
