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
}
