import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AiProviderTypeDto {
    OPENAI = 'OPENAI',
    CLAUDE = 'CLAUDE',
    GEMINI = 'GEMINI',
}

export class CreateAiProviderDto {
    @ApiProperty({ enum: AiProviderTypeDto })
    @IsEnum(AiProviderTypeDto)
    type!: AiProviderTypeDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    label?: string;

    @ApiProperty()
    @IsString()
    @MinLength(10)
    apiKey!: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isEnabled?: boolean;
}