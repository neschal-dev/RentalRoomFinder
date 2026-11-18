import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and } from '@prisma/orm-postgres/orm-client';
import type { LocalUser } from '../auth/types/local-user.type.js';
import { env } from '../env.js';
import { db } from '../prisma/db.js';
import { ESEWA_SIGNED_FIELDS, signEsewa } from './esewa.js';
import { LISTING_FEE_NPR } from './payments.constants.js';

@Injectable()
export class PaymentsService {
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
}
