import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { AiProvidersModule } from '../ai-providers/ai-providers.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [AuthModule, SubscriptionsModule, AiProvidersModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule { }
