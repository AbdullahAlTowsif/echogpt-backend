import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { SearchQueryDto } from './dto/search-query.dto.js';

const CACHE_WINDOW_MS = 10 * 60 * 1000;

type SearchResultsJson = {
    abstract: string | null;
    abstractSource?: string | null;
    relatedTopics: string[];
    note?: string;
};

@Injectable()
export class SearchService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

    async search(userId: string, dto: SearchQueryDto) {
        const cached = await this.prisma.db.orm.public.WebSearch.where({
            userId,
            query: dto.query,
        })
            .orderBy((m) => m.createdAt.desc())
            .first();

        if (cached && this.isFresh(cached.createdAt)) {
            const r = cached.resultsJson as SearchResultsJson | null;
            if (r?.abstract || (r?.relatedTopics?.length ?? 0) > 0) {
                return { query: dto.query, cached: true, results: cached.resultsJson };
            }
        }

        const results = await this.fetchResults(dto.query);

        const isUseful =
            results.abstract != null ||
            (results.relatedTopics?.length ?? 0) > 0;

        if (isUseful) {
            await this.prisma.db.orm.public.WebSearch.create({
                userId,
                query: dto.query,
                resultsJson: results,
            });
        }

        return { query: dto.query, cached: false, results };
    }

    history(userId: string) {
        return this.prisma.db.orm.public.WebSearch.where({ userId }).orderBy((m) => m.createdAt.desc()).limit(50).all();
    }

    recent(userId: string) {
        return this.prisma.db.orm.public.WebSearch.where({ userId }).orderBy((m) => m.createdAt.desc()).limit(5).all();
    }

    async suggestions(userId: string, partial: string) {
        const all = await this.prisma.db.orm.public.WebSearch.where({ userId })
            .orderBy((m) => m.createdAt.desc())
            .limit(100)
            .all();

        const seen = new Set<string>();
        return all
            .map((s) => s.query)
            .filter((q) => q.toLowerCase().startsWith(partial.toLowerCase()))
            .filter((q) => (seen.has(q) ? false : seen.add(q)))
            .slice(0, 5);
    }

    private isFresh(createdAt: unknown): boolean {
        return Date.now() - new Date(String(createdAt)).getTime() < CACHE_WINDOW_MS;
    }

    private async fetchResults(query: string): Promise<SearchResultsJson> {
        const url =
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: { Accept: 'application/json', 'User-Agent': 'EchoGPT/1.0' },
        });

        if (!response.ok) {
            return { abstract: null, relatedTopics: [], note: 'No Wikipedia summary' };
        }

        const data = (await response.json()) as {
            extract?: string;
            description?: string;
            content_urls?: { desktop?: { page?: string } };
        };

        return {
            abstract: data.extract ?? data.description ?? null,
            abstractSource: data.content_urls?.desktop?.page ?? 'Wikipedia',
            relatedTopics: [],
        };
    }
}
