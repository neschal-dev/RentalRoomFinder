import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { db } from './db.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  readonly db = db;
  readonly orm: typeof db.orm.public = db.orm.public;

  async onModuleInit() {
    try {
      // A real round trip: fails at startup if the database cannot be reached.
      await this.orm.User.first();
      this.logger.log('✅ Database connected');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.db.close();
    this.logger.log('🔌 Database connection closed');
  }
}
