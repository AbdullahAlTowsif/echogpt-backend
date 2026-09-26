import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { SearchQueryDto } from './dto/search-query.dto.js';

const CACHE_WINDOW_MS = 15 * 60 * 1000;

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
            return { query: dto.query, cached: true, results: cached.resultsJson };
        }

        const results = await this.fetchResults(dto.query);

        await this.prisma.db.orm.public.WebSearch.create({
            userId,
            query: dto.query,
            resultsJson: results,
        });

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
        const response = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
        );
        if (!response.ok) {
            return { abstract: null, relatedTopics: [], note: 'Search provider unavailable' };
        }
        const data = (await response.json()) as {
            AbstractText?: string;
            AbstractSource?: string;
            RelatedTopics?: { Text?: string }[];
        };
        return {
            abstract: data.AbstractText || null,
            abstractSource: data.AbstractSource || null,
            relatedTopics: (data.RelatedTopics ?? [])
                .slice(0, 5)
                .map((t) => t.Text)
                .filter((t): t is string => Boolean(t)),
        };
    }
}
