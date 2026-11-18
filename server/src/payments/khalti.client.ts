import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { env } from '../env.js';

// What Khalti gives back when we start a payment.
export type KhaltiPayment = {
  pidx: string; // Khalti's id for this payment
  paymentUrl: string; // the Khalti page the owner pays on
};

// What Khalti says about one payment when we ask it directly.
export type KhaltiStatus = {
  // Completed, Pending, Initiated, Expired, "User canceled", Refunded, "Partially Refunded"
  status: string;
  totalAmount: number | null; // in paisa (100 paisa = NPR 1)
  transactionId: string | null;
};

// Talks to Khalti's server. It is its own class so tests can replace it with a fake.
@Injectable()
export class KhaltiClient {
  // Sends one request to Khalti. Every call carries our secret key, which proves it is us.
  private async post(path: string, body: Record<string, unknown>) {
    if (!env.khalti.secretKey) {
      throw new ServiceUnavailableException(
        'Khalti payments are not set up on this server',
      );
    }
    const response = await fetch(`${env.khalti.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${env.khalti.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // Khalti explains what was wrong in the body. We log it for the developer, never show it to the user.
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Khalti ${path} failed with HTTP ${response.status}: ${detail}`,
      );
    }
    return (await response.json()) as Record<string, unknown>;
  }

  // Starts a payment. Khalti counts money in paisa, so NPR 200 is sent as 20000.
  async initiate(input: {
    returnUrl: string;
    websiteUrl: string;
    amountPaisa: number;
    purchaseOrderId: string;
    purchaseOrderName: string;
  }): Promise<KhaltiPayment> {
    const body = await this.post('/epayment/initiate/', {
      return_url: input.returnUrl,
      website_url: input.websiteUrl,
      amount: input.amountPaisa,
      purchase_order_id: input.purchaseOrderId,
      purchase_order_name: input.purchaseOrderName,
    });
    if (
      typeof body['pidx'] !== 'string' ||
      typeof body['payment_url'] !== 'string'
    ) {
      throw new Error('Khalti initiate gave an unexpected answer');
    }
    return { pidx: body['pidx'], paymentUrl: body['payment_url'] };
  }

  // Asks Khalti: "what happened to this payment?" This answer, not the browser's, decides.
  async lookup(pidx: string): Promise<KhaltiStatus> {
    const body = await this.post('/epayment/lookup/', { pidx });
    if (typeof body['status'] !== 'string') {
      throw new Error('Khalti lookup gave an unexpected answer');
    }
    const amount = Number(body['total_amount']);
    const transaction = body['transaction_id'];
    return {
      status: body['status'],
      totalAmount: Number.isFinite(amount) ? amount : null,
      transactionId:
        typeof transaction === 'string' && transaction !== ''
          ? transaction
          : null,
    };
  }
}
