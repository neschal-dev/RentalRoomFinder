import { createHmac, timingSafeEqual } from 'node:crypto';
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

// What eSewa sends back to our success page: a Base64 text that holds this JSON.
export type EsewaCallback = {
  transaction_code: string;
  status: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
};

// The fields we must be able to trust. The reply's signature has to cover all three.
const MUST_BE_SIGNED = ['total_amount', 'transaction_uuid', 'product_code'];

// Turns the Base64 text from the browser into the callback object.
// Returns null when the text is not valid Base64 JSON or a needed field is missing.
export function decodeEsewaCallback(data: string): EsewaCallback | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(data, 'base64').toString('utf8'),
    );
    if (typeof parsed !== 'object' || parsed === null) return null;

    const reply = parsed as Record<string, unknown>;
    for (const key of [
      'transaction_uuid',
      'total_amount',
      'product_code',
      'signed_field_names',
      'signature',
    ]) {
      if (typeof reply[key] !== 'string' || reply[key] === '') return null;
    }
    return reply as unknown as EsewaCallback;
  } catch {
    return null;
  }
}

// True when the reply carries a genuine signature from eSewa.
// We recompute it with our secret key over the fields the reply lists, and compare.
// Only someone with the secret key can make a matching one.
export function isEsewaSignatureValid(reply: EsewaCallback): boolean {
  const names = reply.signed_field_names.split(',');
  if (!MUST_BE_SIGNED.every((name) => names.includes(name))) return false;
  const values = reply as unknown as Record<string, unknown>;
  if (names.some((name) => typeof values[name] !== 'string')) return false;

  const expected = Buffer.from(
    signEsewa(values as Record<string, string>, reply.signed_field_names),
  );
  const received = Buffer.from(reply.signature);
  // Compared in constant time, so the check does not leak how many characters matched.
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
