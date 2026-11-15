import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { MeController } from './me.controller.js';
import { ClerkAuthGuard } from './guard/guard.guard.js';

@Module({
  // The guard needs UsersService, which UsersModule exports.
  imports: [UsersModule],
  controllers: [MeController],
  providers: [ClerkAuthGuard],
  // Other modules import AuthModule to protect their routes with the guard.
  exports: [ClerkAuthGuard],
})
export class AuthModule {}
