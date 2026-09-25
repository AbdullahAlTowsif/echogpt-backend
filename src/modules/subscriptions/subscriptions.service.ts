import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { UpdatePlanDto } from './dto/update-plan.dto.js';

const PLAN_LIMITS: Record<string, number> = {
    FREE: 50,
    PREMIUM: 1000,
};

@Injectable()
export class SubscriptionsService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

    async getMine(userId: string) {
        const subscription = await this.prisma.db.orm.public.Subscription.where({ userId }).first();
        if (!subscription) throw new NotFoundException('No subscription found for this user');
        return subscription;
    }

    async updatePlan(userId: string, dto: UpdatePlanDto) {
        const subscription = await this.getMine(userId);
        const requestLimit = PLAN_LIMITS[dto.plan] ?? subscription.requestLimit;

        return this.prisma.db.orm.public.Subscription.where({ id: subscription.id }).update({
            plan: dto.plan,
            requestLimit,
            requestsUsed: 0,
            status: 'ACTIVE',
        });
    }

    async getUsage(userId: string) {
        const subscription = await this.getMine(userId);
        return {
            plan: subscription.plan,
            requestLimit: subscription.requestLimit,
            requestsUsed: subscription.requestsUsed,
            remainingRequests: Math.max(subscription.requestLimit - subscription.requestsUsed, 0),
        };
    }

    /** Called by Chat/Search modules (Day 4) before fulfilling a request. */
    async consumeRequest(userId: string): Promise<void> {
        const subscription = await this.getMine(userId);
        if (subscription.requestsUsed >= subscription.requestLimit) {
            throw new Error('Usage limit reached for current plan');
        }
        await this.prisma.db.orm.public.Subscription.where({ id: subscription.id }).update({
            requestsUsed: subscription.requestsUsed + 1,
        });
    }
}
