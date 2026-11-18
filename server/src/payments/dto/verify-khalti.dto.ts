import { IsUUID } from 'class-validator';

// The body of POST /payments/khalti/verify.
// Khalti puts our own id for the payment (purchase_order_id) in the address when it sends the owner back.
// Nothing else from the address is used: the server asks Khalti for the facts itself.
export class VerifyKhaltiDto {
  @IsUUID()
  purchaseOrderId!: string;
}
