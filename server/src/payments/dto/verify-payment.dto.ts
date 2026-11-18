import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// The body of POST /payments/esewa/verify: the Base64 text eSewa put in the address
// when it sent the owner back. A real one is well under 2000 characters.
export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  data!: string;
}
