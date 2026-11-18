import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { EsewaClient } from './esewa.client.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  // AuthModule gives the login guard. UsersModule gives UsersService, which the guard needs.
  imports: [AuthModule, UsersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, EsewaClient],
})
export class PaymentsModule {}
