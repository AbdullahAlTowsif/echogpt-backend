import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAiProviderDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    label?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MinLength(10)
    apiKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isEnabled?: boolean;
}
