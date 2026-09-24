import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { HealthController } from './modules/health.controller.js';

@Module({
  imports: [
    // All Modules Here
  DatabaseModule,
    HealthModule],
  controllers: [HealthController],
})
export class AppModule {}
