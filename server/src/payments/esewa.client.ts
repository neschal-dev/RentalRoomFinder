import { Injectable } from '@nestjs/common';
import { env } from '../env.js';

// What eSewa says about one payment when we ask it directly.
export type EsewaStatus = {
  // COMPLETE, PENDING, AMBIGUOUS, NOT_FOUND, CANCELED, FULL_REFUND, PARTIAL_REFUND
  status: string;
  totalAmount: number | null;
  refId: string | null;
};

// Talks to eSewa's server. It is its own class so tests can replace it with a fake.
@Injectable()
export class EsewaClient {
  // Asks eSewa: "what happened to this payment?" This answer, not the browser's, decides.
  // Throws if eSewa cannot be reached, so the caller does not mistake that for "not paid".
  async getStatus(
    transactionUuid: string,
    totalAmount: number,
  ): Promise<EsewaStatus> {
    const url = new URL(env.esewa.statusUrl);
    url.searchParams.set('product_code', env.esewa.productCode);
    url.searchParams.set('total_amount', String(totalAmount));
    url.searchParams.set('transaction_uuid', transactionUuid);

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(`eSewa status check failed with HTTP ${response.status}`);
    }

    // eSewa's docs show two spellings of some fields, so we accept both.
    const body = (await response.json()) as Record<string, unknown>;
    if (typeof body['status'] !== 'string') {
      throw new Error('eSewa status check gave an unexpected answer');
    }
    const amount = Number(body['total_amount'] ?? body['totalAmount']);
    const ref = body['ref_id'] ?? body['refId'];
    return {
      status: body['status'],
      totalAmount: Number.isFinite(amount) ? amount : null,
      refId: typeof ref === 'string' && ref !== '' ? ref : null,
    };
  }
}
