import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [
    // All Modules Here
  DatabaseModule],
})
export class AppModule {}
