// Loads the .env file into process.env. This is the ONLY file that does this.
import 'dotenv/config';

// Names of required variables that are missing, collected so we can report them all at once.
const missing: string[] = [];

// Returns the value of a required variable. If it is empty or absent, we remember its name.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    missing.push(name);
    return '';
  }
  return value;
}

// Reads the port, with 3000 as the default. Stops the server if the value is not a number.
function readPort(): number {
  const port = Number(process.env['PORT'] ?? 3000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      `PORT must be a positive whole number, got: ${process.env['PORT']}`,
    );
  }
  return port;
}

// Every setting the server needs, in one typed object. Use it as: env.databaseUrl
export const env = {
  port: readPort(),
  databaseUrl: required('DATABASE_URL'),
  clientUrl: required('CLIENT_URL'), // the Next.js app, used for CORS and Clerk tokens
  clerkPublishableKey: required('CLERK_PUBLISHABLE_KEY'),
  clerkSecretKey: required('CLERK_SECRET_KEY'),
};

// All variables were checked above. If any is missing, stop now with one clear message.
if (missing.length > 0) {
  throw new Error(
    `Missing environment variables in .env: ${missing.join(', ')}`,
  );
}
