import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SearchService } from './search.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';

@ApiTags('Search')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
    constructor(@Inject(SearchService) private readonly searchService: SearchService) { }

    @Post()
    search(@CurrentUser('sub') userId: string, @Body() dto: SearchQueryDto) {
        return this.searchService.search(userId, dto);
    }

    @Get('history')
    history(@CurrentUser('sub') userId: string) {
        return this.searchService.history(userId);
    }

    @Get('recent')
    recent(@CurrentUser('sub') userId: string) {
        return this.searchService.recent(userId);
    }

    @Get('suggestions')
    suggestions(@CurrentUser('sub') userId: string, @Query('q') q: string) {
        return this.searchService.suggestions(userId, q ?? '');
    }
}
