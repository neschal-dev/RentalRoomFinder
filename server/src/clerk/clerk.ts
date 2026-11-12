import 'dotenv/config';
import { createClerkClient } from '@clerk/express';

// Read a required env variable, or stop the server at startup with a clear message.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const clerkConfig = {
  publishableKey: requireEnv('CLERK_PUBLISHABLE_KEY'),
  secretKey: requireEnv('CLERK_SECRET_KEY'),
  // Only tokens issued for our own Next.js app are accepted.
  // This is what makes the cross-origin (3001 -> 3000) setup safe.
  authorizedParties: [requireEnv('CLIENT_URL')],
};

// Used to ask Clerk for details about a user (for example, is their phone verified).
export const clerk = createClerkClient({
  publishableKey: clerkConfig.publishableKey,
  secretKey: clerkConfig.secretKey,
});