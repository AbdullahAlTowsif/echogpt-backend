import {
    BadGatewayException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { AiProvidersService } from '../ai-providers/ai-providers.service.js';
import { dispatchChat } from './providers/index.js';
import type { SendMessageDto } from './dto/send-message.dto.js';

@Injectable()
export class ChatService {
    constructor(
        @Inject(PrismaService) private readonly prisma: PrismaService,
        @Inject(SubscriptionsService) private readonly subscriptions: SubscriptionsService,
        @Inject(AiProvidersService) private readonly aiProviders: AiProvidersService,
    ) { }

    async sendMessage(userId: string, dto: SendMessageDto) {
        await this.subscriptions.consumeRequest(userId);

        const provider = await this.aiProviders.getDecryptedForInternalUse(userId, dto.providerId);

        let conversation = dto.conversationId
            ? await this.getOwnedConversation(userId, dto.conversationId)
            : null;

        if (!conversation) {
            conversation = await this.prisma.db.orm.public.Conversation.create({
                userId,
                aiProviderId: provider.id,
                title: dto.prompt.slice(0, 60),
            });
        }

        await this.prisma.db.orm.public.ChatMessage.create({
            conversationId: conversation.id,
            role: 'USER',
            content: dto.prompt,
        });

        const history = await this.prisma.db.orm.public.ChatMessage.where({
            conversationId: conversation.id,
        })
            .orderBy((m) => m.createdAt.asc())
            .limit(20)
            .all();

        const startedAt = Date.now();
        let result;
        try {
            result = await dispatchChat(
                provider.type,
                provider.apiKey,
                history.map((m) => ({
                    role: m.role.toLowerCase() as 'user' | 'assistant',
                    content: m.content,
                })),
            );
        } catch (err) {
            await this.logUsage(userId, provider.type, 502, Date.now() - startedAt);
            throw new BadGatewayException(err instanceof Error ? err.message : 'AI provider request failed');
        }

        await this.prisma.db.orm.public.ChatMessage.create({
            conversationId: conversation.id,
            role: 'ASSISTANT',
            content: result.content,
            tokensUsed: result.tokensUsed,
        });

        await this.logUsage(userId, provider.type, 200, Date.now() - startedAt, result.tokensUsed);

        return { conversationId: conversation.id, response: result.content, tokensUsed: result.tokensUsed };
    }

    listConversations(userId: string) {
        return this.prisma.db.orm.public.Conversation.where({ userId }).orderBy((c) => c.updatedAt.desc()).all();
    }

    async getHistory(userId: string, conversationId: string) {
        await this.getOwnedConversation(userId, conversationId);
        return this.prisma.db.orm.public.ChatMessage.where({ conversationId }).orderBy((m) => m.createdAt.asc()).all();
    }

    private async getOwnedConversation(userId: string, conversationId: string) {
        const conversation = await this.prisma.db.orm.public.Conversation.where({ id: conversationId }).first();
        if (!conversation) throw new NotFoundException('Conversation not found');
        if (conversation.userId !== userId) throw new ForbiddenException('Not your conversation');
        return conversation;
    }

    private async logUsage(
        userId: string,
        provider: 'OPENAI' | 'CLAUDE' | 'GEMINI',
        statusCode: number,
        durationMs: number,
        tokensUsed?: number,
    ) {
        await this.prisma.db.orm.public.ApiUsageLog.create({
            userId,
            endpoint: '/api/v1/chat',
            method: 'POST',
            statusCode,
            provider,
            tokensUsed,
            durationMs,
        });
    }
}
