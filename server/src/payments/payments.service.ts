import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
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
  KhaltiClient,
  type KhaltiPayment,
  type KhaltiStatus,
} from './khalti.client.js';
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

  constructor(
    @Inject(EsewaClient) private readonly esewa: EsewaClient,
    @Inject(KhaltiClient) private readonly khalti: KhaltiClient,
  ) {}

  // The listing the owner wants to pay for. 404 if it does not exist, 403 if it is not theirs,
  // 400 if it does not need a payment (only "waiting for payment" and "expired" do).
  private async loadPayableListing(user: LocalUser, listingId: string) {
    const listing = await db.orm.public.Listing.where((l) =>
      and(l.id.eq(listingId), l.status.neq('removed')),
    ).first();

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.ownerId !== user.id) {
      throw new ForbiddenException('You can only pay for your own listings');
    }
    if (listing.status !== 'pending_payment' && listing.status !== 'expired') {
      throw new BadRequestException('This listing does not need a payment');
    }
    return listing;
  }

  // Step 1 of paying. Creates a payment record and returns what the browser needs to open eSewa.
  async initiateEsewa(user: LocalUser, listingId: string) {
    const listing = await this.loadPayableListing(user, listingId);

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

  // -------------------------------------------------------------------------
  // Khalti
  // -------------------------------------------------------------------------

  // Step 1 of paying with Khalti. We start the payment on Khalti's server and
  // return the address of the Khalti page the owner pays on.
  async initiateKhalti(user: LocalUser, listingId: string) {
    const listing = await this.loadPayableListing(user, listingId);

    // Our own id for this try. Khalti sends it back (as purchase_order_id) so we can find the payment.
    const transactionUuid = randomUUID();
    const payment = await db.orm.public.Payment.create({
      listingId: listing.id,
      userId: user.id,
      provider: 'khalti',
      amount: LISTING_FEE_NPR,
      transactionUuid,
    });

    let started: KhaltiPayment;
    try {
      started = await this.khalti.initiate({
        returnUrl: `${env.clientUrl}/payment/khalti/success`,
        websiteUrl: env.clientUrl,
        amountPaisa: LISTING_FEE_NPR * 100,
        purchaseOrderId: transactionUuid,
        purchaseOrderName: 'FindMeAPlace listing (30 days)',
      });
    } catch (error) {
      // The attempt never reached Khalti's payment page, so it counts as failed.
      await db.orm.public.Payment.where({ id: payment.id }).update({
        status: 'failed',
      });
      if (error instanceof HttpException) throw error;
      this.logger.error('Khalti initiate failed', error);
      throw new ServiceUnavailableException(
        'Could not start the Khalti payment. Try again in a moment.',
      );
    }

    // Remember Khalti's id (pidx). Verify uses THIS stored value, never one from the browser.
    await db.orm.public.Payment.where({ id: payment.id }).update({
      transactionId: started.pidx,
    });

    return { paymentId: payment.id, paymentUrl: started.paymentUrl };
  }

  // Step 2 of paying with Khalti. The owner is back from Khalti; we ask Khalti what really happened.
  async verifyKhalti(user: LocalUser, purchaseOrderId: string) {
    // 1. It must be a Khalti payment we started, for this user.
    const payment = await db.orm.public.Payment.where((p) =>
      and(p.transactionUuid.eq(purchaseOrderId), p.provider.eq('khalti')),
    ).first();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.userId !== user.id) {
      throw new ForbiddenException('This payment belongs to someone else');
    }

    // 2. Already confirmed earlier (the owner reloaded the page): report it, change nothing.
    if (payment.status === 'success') {
      return this.summary(payment.id, payment.listingId, 'success');
    }

    // 3. Without Khalti's id the payment never reached Khalti's page.
    const pidx = payment.transactionId;
    if (!pidx) {
      return this.summary(payment.id, payment.listingId, 'failed');
    }

    // 4. Ask Khalti directly. If we cannot reach it, say so: that is not "unpaid".
    let status: KhaltiStatus;
    try {
      status = await this.khalti.lookup(pidx);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Khalti lookup failed', error);
      throw new ServiceUnavailableException(
        'Could not confirm the payment with Khalti. Try again in a moment.',
      );
    }

    // 5. Still in progress: leave everything as it is, the owner can check again.
    if (status.status === 'Pending' || status.status === 'Initiated') {
      return this.summary(payment.id, payment.listingId, 'pending');
    }

    // 6. Paid in full, for exactly the price WE stored (paisa), never an amount from the browser.
    if (
      status.status === 'Completed' &&
      status.totalAmount === payment.amount * 100
    ) {
      await this.activate(
        payment.id,
        payment.listingId,
        status.transactionId ?? pidx,
      );
      return this.summary(payment.id, payment.listingId, 'success');
    }

    // 7. Anything else (cancelled, expired, refunded, wrong amount): not paid.
    this.logger.warn(
      `Payment ${payment.id} not accepted: Khalti says ${status.status}, amount ${status.totalAmount}`,
    );
    await db.orm.public.Payment.where((p) =>
      and(p.id.eq(payment.id), p.status.eq('started')),
    ).update({ status: 'failed' });
    return this.summary(payment.id, payment.listingId, 'failed');
  }
}
