import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and } from '@prisma/orm-postgres/orm-client';
import type { LocalUser } from '../auth/types/local-user.type.js';
import { env } from '../env.js';
import { db } from '../prisma/db.js';
import { LISTING_DURATION_DAYS } from '../listings/listings.constants.js';
import { EsewaClient, type EsewaStatus } from './esewa.client.js';
import {
  decodeEsewaCallback,
  ESEWA_SIGNED_FIELDS,
  isEsewaSignatureValid,
  signEsewa,
} from './esewa.js';
import { LISTING_FEE_NPR } from './payments.constants.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(@Inject(EsewaClient) private readonly esewa: EsewaClient) {}

  // Step 1 of paying. Creates a payment record and returns what the browser needs to open eSewa.
  async initiateEsewa(user: LocalUser, listingId: string) {
    const listing = await db.orm.public.Listing.where((l) =>
      and(l.id.eq(listingId), l.status.neq('removed')),
    ).first();

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.ownerId !== user.id) {
      throw new ForbiddenException('You can only pay for your own listings');
    }
    // Only a listing that is waiting for payment (or ran out) can be paid for.
    if (listing.status !== 'pending_payment' && listing.status !== 'expired') {
      throw new BadRequestException('This listing does not need a payment');
    }

    // Our own id for this try. eSewa sends it back so we know which payment the reply is for.
    const transactionUuid = randomUUID();

    const payment = await db.orm.public.Payment.create({
      listingId: listing.id,
      userId: user.id,
      provider: 'esewa',
      amount: LISTING_FEE_NPR,
      transactionUuid,
    });

    // eSewa wants every field, even the ones we do not use (they must be "0").
    const total = String(LISTING_FEE_NPR);
    const fields: Record<string, string> = {
      amount: total,
      tax_amount: '0',
      product_service_charge: '0',
      product_delivery_charge: '0',
      total_amount: total,
      transaction_uuid: transactionUuid,
      product_code: env.esewa.productCode,
      success_url: `${env.clientUrl}/payment/esewa/success`,
      failure_url: `${env.clientUrl}/payment/esewa/failure`,
      signed_field_names: ESEWA_SIGNED_FIELDS,
    };
    fields['signature'] = signEsewa(fields, ESEWA_SIGNED_FIELDS);

    return { paymentId: payment.id, formUrl: env.esewa.formUrl, fields };
  }

  // Step 2 of paying. The browser comes back from eSewa and hands us the reply.
  // Nothing in that reply is trusted until eSewa itself confirms it.
  async verifyEsewa(user: LocalUser, data: string) {
    // 1. The reply must be well formed and carry a genuine eSewa signature.
    const reply = decodeEsewaCallback(data);
    if (!reply || !isEsewaSignatureValid(reply)) {
      throw new BadRequestException('This payment reply is not valid');
    }

    // 2. It must be a payment we started, for this user.
    const payment = await db.orm.public.Payment.where((p) =>
      p.transactionUuid.eq(reply.transaction_uuid),
    ).first();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.userId !== user.id) {
      throw new ForbiddenException('This payment belongs to someone else');
    }

    // 3. Already confirmed earlier (the owner reloaded the page): report it, change nothing.
    if (payment.status === 'success') {
      return this.summary(payment.id, payment.listingId, 'success');
    }

    // 4. Ask eSewa directly. If we cannot reach it, say so: that is not "unpaid".
    let status: EsewaStatus;
    try {
      status = await this.esewa.getStatus(
        payment.transactionUuid,
        payment.amount,
      );
    } catch (error) {
      this.logger.error('eSewa status check failed', error);
      throw new ServiceUnavailableException(
        'Could not confirm the payment with eSewa. Try again in a moment.',
      );
    }

    // 5. Still in progress: leave everything as it is, the owner can check again.
    if (status.status === 'PENDING' || status.status === 'AMBIGUOUS') {
      return this.summary(payment.id, payment.listingId, 'pending');
    }

    // 6. Paid in full, for exactly the price WE stored (never the amount in the reply).
    if (status.status === 'COMPLETE' && status.totalAmount === payment.amount) {
      await this.activate(
        payment.id,
        payment.listingId,
        status.refId ?? reply.transaction_code ?? null,
      );
      return this.summary(payment.id, payment.listingId, 'success');
    }

    // 7. Anything else (not found, cancelled, refunded, wrong amount): not paid.
    this.logger.warn(
      `Payment ${payment.id} not accepted: eSewa says ${status.status}, amount ${status.totalAmount}`,
    );
    await db.orm.public.Payment.where((p) =>
      and(p.id.eq(payment.id), p.status.eq('started')),
    ).update({ status: 'failed' });
    return this.summary(payment.id, payment.listingId, 'failed');
  }

  // Marks the payment paid and puts the listing live for 30 days, in one transaction.
  private async activate(
    paymentId: string,
    listingId: string,
    transactionId: string | null,
  ) {
    await db.transaction(async (tx) => {
      // Only the first request to get here wins. A second one at the same time finds
      // the payment already "success" and does nothing, so the 30 days are never added twice.
      const claimed = await tx.orm.public.Payment.where((p) =>
        and(p.id.eq(paymentId), p.status.neq('success')),
      ).update({ status: 'success', transactionId });
      if (!claimed) return;

      // A listing that was removed or hidden by a moderator stays that way.
      await tx.orm.public.Listing.where((l) =>
        and(l.id.eq(listingId), l.status.in(['pending_payment', 'expired'])),
      ).update({
        status: 'active',
        expiresAt: Temporal.Now.instant().add({
          hours: LISTING_DURATION_DAYS * 24,
        }),
      });
    });
  }

  // What the client needs after paying.
  private async summary(
    paymentId: string,
    listingId: string,
    paymentStatus: 'success' | 'pending' | 'failed',
  ) {
    const listing = await db.orm.public.Listing.where({
      id: listingId,
    }).first();
    return {
      paymentId,
      paymentStatus,
      listingId,
      listingStatus: listing?.status ?? null,
      expiresAt: listing?.expiresAt?.toString() ?? null,
    };
  }
}
