import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AiProvidersService } from './ai-providers.service.js';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto.js';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto.js';

@ApiTags('AI Providers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai-providers')
export class AiProvidersController {
    constructor(
        @Inject(AiProvidersService) private readonly aiProvidersService: AiProvidersService,
    ) { }

    @Post()
    create(@CurrentUser('sub') userId: string, @Body() dto: CreateAiProviderDto) {
        return this.aiProvidersService.create(userId, dto);
    }

    @Get()
    findAll(@CurrentUser('sub') userId: string) {
        return this.aiProvidersService.findAll(userId);
    }

    @Get(':id')
    findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
        return this.aiProvidersService.findOne(userId, id);
    }

    @Patch(':id')
    update(
        @CurrentUser('sub') userId: string,
        @Param('id') id: string,
        @Body() dto: UpdateAiProviderDto,
    ) {
        return this.aiProvidersService.update(userId, id, dto);
    }

    @Delete(':id')
    remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
        return this.aiProvidersService.remove(userId, id);
    }

    @Patch(':id/enable')
    enable(@CurrentUser('sub') userId: string, @Param('id') id: string) {
        return this.aiProvidersService.enable(userId, id);
    }

    @Patch(':id/disable')
    disable(@CurrentUser('sub') userId: string, @Param('id') id: string) {
        return this.aiProvidersService.disable(userId, id);
    }

    @Patch(':id/default')
    setDefault(@CurrentUser('sub') userId: string, @Param('id') id: string) {
        return this.aiProvidersService.setDefault(userId, id);
    }

    @Post(':id/health-check')
    healthCheck(@CurrentUser('sub') userId: string, @Param('id') id: string) {
        return this.aiProvidersService.healthCheck(userId, id);
    }
}
