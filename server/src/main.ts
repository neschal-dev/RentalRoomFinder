import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { clerkMiddleware } from '@clerk/express';
import { AppModule } from './app.module.js';
import { clerkConfig } from './clerk/clerk.js';
import { env } from './env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Let the Next.js app (a different origin) call this API from the browser.
  app.enableCors({ origin: clerkConfig.authorizedParties });

  // Reads the Bearer token on every request and remembers who it belongs to.
  // It never rejects a request, so public routes stay open.
  app.use(clerkMiddleware(clerkConfig));

 await app.listen(env.port);
}

void bootstrap();
