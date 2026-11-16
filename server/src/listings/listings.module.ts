import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { FacilitiesController } from './facilities.controller.js';
import { ListingsController } from './listings.controller.js';
import { ListingsService } from './listings.service.js';

@Module({
  // AuthModule gives us the login guard. UsersModule gives us UsersService.
  imports: [AuthModule, UsersModule],
  controllers: [ListingsController, FacilitiesController],
  providers: [ListingsService],
})
export class ListingsModule {}
