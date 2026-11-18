import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorator/current-user.decorator.js';
import { ClerkAuthGuard } from '../auth/guard/guard.guard.js';
import type { LocalUser } from '../auth/types/local-user.type.js';
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js';
import { VerifyKhaltiDto } from './dto/verify-khalti.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  // POST /payments/esewa/initiate   (login needed)
  // The browser then posts the returned fields to the returned formUrl.
  @Post('esewa/initiate')
  @HttpCode(200)
  @UseGuards(ClerkAuthGuard)
  initiateEsewa(
    @CurrentUser() user: LocalUser,
    @Body() body: InitiatePaymentDto,
  ) {
    return this.payments.initiateEsewa(user, body.listingId);
  }

  // POST /payments/esewa/verify   (login needed)
  // The success page sends what eSewa put in the address. The server confirms it with eSewa.
  @Post('esewa/verify')
  @HttpCode(200)
  @UseGuards(ClerkAuthGuard)
  verifyEsewa(@CurrentUser() user: LocalUser, @Body() body: VerifyPaymentDto) {
    return this.payments.verifyEsewa(user, body.data);
  }

  // POST /payments/khalti/initiate   (login needed)
  // Returns the Khalti page address. The browser then goes there.
  @Post('khalti/initiate')
  @HttpCode(200)
  @UseGuards(ClerkAuthGuard)
  initiateKhalti(
    @CurrentUser() user: LocalUser,
    @Body() body: InitiatePaymentDto,
  ) {
    return this.payments.initiateKhalti(user, body.listingId);
  }

  // POST /payments/khalti/verify   (login needed)
  // The result page sends our payment id; the server asks Khalti what happened.
  @Post('khalti/verify')
  @HttpCode(200)
  @UseGuards(ClerkAuthGuard)
  verifyKhalti(@CurrentUser() user: LocalUser, @Body() body: VerifyKhaltiDto) {
    return this.payments.verifyKhalti(user, body.purchaseOrderId);
  }
}
