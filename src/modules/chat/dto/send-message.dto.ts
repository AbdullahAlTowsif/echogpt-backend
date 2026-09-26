import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
    @ApiPropertyOptional({ description: 'Existing conversation id; omit to start a new one' })
    @IsOptional()
    @IsUUID()
    conversationId?: string;

    @ApiPropertyOptional({ description: 'AI provider id; omit to use your default provider' })
    @IsOptional()
    @IsUUID()
    providerId?: string;

    @ApiProperty()
    @IsString()
    prompt!: string;
}
