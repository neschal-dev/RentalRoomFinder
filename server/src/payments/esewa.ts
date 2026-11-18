import { createHmac } from 'node:crypto';
import { env } from '../env.js';

// The fields eSewa signs, in the order eSewa requires.
export const ESEWA_SIGNED_FIELDS = 'total_amount,transaction_uuid,product_code';

// Makes the signature eSewa expects.
//
// We write the signed fields as "name=value" pairs joined by commas, then compute an
// HMAC-SHA256 of that text using our secret key and write it in Base64.
// eSewa repeats the calculation. If both results match, the amount was not changed on the way.
//
// Example: signEsewa({ total_amount: '200', transaction_uuid: 'abc', product_code: 'EPAYTEST' }, 'total_amount,transaction_uuid,product_code')
export function signEsewa(
  values: Record<string, string>,
  signedFieldNames: string,
): string {
  const text = signedFieldNames
    .split(',')
    .map((name) => `${name}=${values[name]}`)
    .join(',');
  return createHmac('sha256', env.esewa.secretKey)
    .update(text)
    .digest('base64');
}
