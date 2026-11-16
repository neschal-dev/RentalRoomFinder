import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';

@Module({
  // AuthModule gives the login guard. UsersModule gives UsersService, which the guard needs.
  imports: [AuthModule, UsersModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
