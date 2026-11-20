import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ClerkModule } from './clerk/clerk.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ListingsModule } from './listings/listings.module.js';
import { MediaModule } from './media/media.module.js';

@Module({
  imports: [
    PrismaModule,
    ClerkModule,
    UsersModule,
    AuthModule,
    ListingsModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Checks every request body and query string against its DTO class.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        // Remove fields the DTO does not know ...
        whitelist: true,
        // ... and answer 400 instead of silently ignoring them (so "status" can never be sent).
        forbidNonWhitelisted: true,
        // Turn the plain request data into DTO objects (needed for @Type and @Transform).
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
