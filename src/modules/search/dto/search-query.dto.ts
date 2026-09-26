import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchQueryDto {
    @ApiProperty({ example: 'latest NestJS release notes' })
    @IsString()
    @MinLength(2)
    query!: string;
}
