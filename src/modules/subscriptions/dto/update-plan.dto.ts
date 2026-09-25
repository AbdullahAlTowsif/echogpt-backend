import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SubscriptionPlanDto {
    FREE = 'FREE',
    PREMIUM = 'PREMIUM',
}

export class UpdatePlanDto {
    @ApiProperty({ enum: SubscriptionPlanDto })
    @IsEnum(SubscriptionPlanDto)
    plan!: SubscriptionPlanDto;
}
