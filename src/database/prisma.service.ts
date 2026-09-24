import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly db = db;

  async onModuleDestroy(): Promise<void> {
    await this.db.close();
  }
}
