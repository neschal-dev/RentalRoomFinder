import { IsUUID } from 'class-validator';

// The body of POST /payments/esewa/initiate. Only the listing: the amount is not up to the browser.
export class InitiatePaymentDto {
  @IsUUID()
  listingId!: string;
}
