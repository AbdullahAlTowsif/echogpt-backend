import { Body, Controller, Get, Inject, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';

@ApiTags('Subscriptions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
    constructor(
        @Inject(SubscriptionsService) private readonly subscriptionsService: SubscriptionsService,
    ) { }

    @Get('me')
    getMine(@CurrentUser('sub') userId: string) {
        return this.subscriptionsService.getMine(userId);
    }

    @Patch('me/plan')
    updatePlan(@CurrentUser('sub') userId: string, @Body() dto: UpdatePlanDto) {
        return this.subscriptionsService.updatePlan(userId, dto);
    }

    @Get('me/usage')
    getUsage(@CurrentUser('sub') userId: string) {
        return this.subscriptionsService.getUsage(userId);
    }
}
