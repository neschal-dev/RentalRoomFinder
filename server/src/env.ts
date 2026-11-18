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

// CLOUDINARY_URL looks like cloudinary://<api_key>:<api_secret>@<cloud_name>.
// We split it into its three parts. Stops the server if it does not have that shape.
function readCloudinary() {
  const raw = required('CLOUDINARY_URL');
  if (!raw) return { cloudName: '', apiKey: '', apiSecret: '' };

  const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(raw);
  if (!match) {
    throw new Error(
      'CLOUDINARY_URL must look like cloudinary://<api_key>:<api_secret>@<cloud_name>',
    );
  }
  return { apiKey: match[1]!, apiSecret: match[2]!, cloudName: match[3]! };
}

// A setting with a fallback. Used for eSewa's public TEST values, so development works with no setup.
// In production the fallback is not allowed: the real value must be in .env.
function withTestDefault(name: string, testValue: string): string {
  if (process.env['NODE_ENV'] === 'production') {
    return required(name);
  }
  return process.env[name] || testValue;
}

// eSewa settings. The defaults are the public test values from eSewa's developer docs.
function readEsewa() {
  return {
    productCode: withTestDefault('ESEWA_PRODUCT_CODE', 'EPAYTEST'),
    secretKey: withTestDefault('ESEWA_SECRET_KEY', '8gBm/:&EnhH.1/q('),
    // Where the browser sends the payment form, and where the server checks a payment.
    formUrl: withTestDefault(
      'ESEWA_FORM_URL',
      'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    ),
    statusUrl: withTestDefault(
      'ESEWA_STATUS_URL',
      'https://rc.esewa.com.np/api/epay/transaction/status/',
    ),
  };
}

// Every setting the server needs, in one typed object. Use it as: env.databaseUrl
export const env = {
  port: readPort(),
  databaseUrl: required('DATABASE_URL'),
  clientUrl: required('CLIENT_URL'), // the Next.js app, used for CORS and Clerk tokens
  clerkPublishableKey: required('CLERK_PUBLISHABLE_KEY'),
  clerkSecretKey: required('CLERK_SECRET_KEY'),
  cloudinary: readCloudinary(), // where photos and videos are stored
  esewa: readEsewa(), // payments
};

// All variables were checked above. If any is missing, stop now with one clear message.
if (missing.length > 0) {
  throw new Error(
    `Missing environment variables in .env: ${missing.join(', ')}`,
  );
}
