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
      // connection check goes here (see below)
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
