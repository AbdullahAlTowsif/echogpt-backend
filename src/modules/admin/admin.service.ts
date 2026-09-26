import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class AdminService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

    async dashboardStats() {
        const [users, subscriptions, conversations, searches, logs] = await Promise.all([
            this.prisma.db.orm.public.User.all(),
            this.prisma.db.orm.public.Subscription.all(),
            this.prisma.db.orm.public.Conversation.all(),
            this.prisma.db.orm.public.WebSearch.all(),
            this.prisma.db.orm.public.ApiUsageLog.all(),
        ]);

        const premiumCount = subscriptions.filter((s) => s.plan === 'PREMIUM').length;

        return {
            totalUsers: users.length,
            activeUsers: users.filter((u) => u.isActive).length,
            totalSubscriptions: subscriptions.length,
            premiumSubscriptions: premiumCount,
            freeSubscriptions: subscriptions.length - premiumCount,
            totalConversations: conversations.length,
            totalSearches: searches.length,
            totalApiCalls: logs.length,
        };
    }

    listUsers() {
        return this.prisma.db.orm.public.User.orderBy((m) => m.createdAt.desc()).limit(200).all();
    }

    setUserActive(userId: string, isActive: boolean) {
        return this.prisma.db.orm.public.User.where({ id: userId }).update({ isActive });
    }

    async deleteUser(userId: string) {
        await this.prisma.db.orm.public.User.where({ id: userId }).delete();
        return { message: 'User deleted' };
    }

    listSubscriptions() {
        return this.prisma.db.orm.public.Subscription.orderBy((m) => m.createdAt.desc()).limit(200).all();
    }

    updateSubscription(id: string, patch: Record<string, unknown>) {
        return this.prisma.db.orm.public.Subscription.where({ id }).update(patch);
    }

    listAiProviders() {
        return this.prisma.db.orm.public.AiProvider.orderBy((m) => m.createdAt.desc()).limit(200).all();
    }

    setAiProviderEnabled(id: string, isEnabled: boolean) {
        return this.prisma.db.orm.public.AiProvider.where({ id }).update({ isEnabled });
    }

    async usageAnalytics() {
        const logs = await this.prisma.db.orm.public.ApiUsageLog.orderBy((m) => m.createdAt.desc()).limit(1000).all();

        const byProvider: Record<string, number> = {};
        const byEndpoint: Record<string, number> = {};
        let totalDurationMs = 0;

        for (const log of logs) {
            if (log.provider) byProvider[log.provider] = (byProvider[log.provider] ?? 0) + 1;
            byEndpoint[log.endpoint] = (byEndpoint[log.endpoint] ?? 0) + 1;
            totalDurationMs += log.durationMs ?? 0;
        }

        return {
            totalRequests: logs.length,
            averageDurationMs: logs.length ? Math.round(totalDurationMs / logs.length) : 0,
            byProvider,
            byEndpoint,
        };
    }

    requestLogs() {
        return this.prisma.db.orm.public.ApiUsageLog.orderBy((m) => m.createdAt.desc()).limit(200).all();
    }

    async systemHealth() {
        try {
            await this.prisma.db.orm.public.Role.limit(1).all();
            return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
        } catch {
            return { status: 'error', database: 'disconnected', timestamp: new Date().toISOString() };
        }
    }
}
