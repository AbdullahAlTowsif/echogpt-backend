import {
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { decrypt, encrypt, maskKey } from '../../common/utils/encryption.util.js';
import type { CreateAiProviderDto } from './dto/create-ai-provider.dto.js';
import type { UpdateAiProviderDto } from './dto/update-ai-provider.dto.js';
import { Temporal } from 'temporal-polyfill';

@Injectable()
export class AiProvidersService {
    constructor(
        @Inject(PrismaService) private readonly prisma: PrismaService,
        @Inject(ConfigService) private readonly config: ConfigService,
    ) { }

    async create(userId: string, dto: CreateAiProviderDto) {
        const encryptionKey = this.config.get<string>('encryptionKey')!;
        const apiKeyEncrypted = encrypt(dto.apiKey, encryptionKey);
        console.log(apiKeyEncrypted);

        const provider = await this.prisma.db.orm.public.AiProvider.create({
            userId,
            type: dto.type,
            label: dto.label,
            apiKeyEncrypted,
            isEnabled: dto.isEnabled ?? true,
            isDefault: false,
        });

        return this.toSafeProvider(provider);
    }

    async findAll(userId: string) {
        const providers = await this.prisma.db.orm.public.AiProvider.where({ userId }).all();
        return providers.map((p) => this.toSafeProvider(p));
    }

    async findOne(userId: string, id: string) {
        const provider = await this.getOwned(userId, id);
        return this.toSafeProvider(provider);
    }

    async update(userId: string, id: string, dto: UpdateAiProviderDto) {
        await this.getOwned(userId, id);

        const patch: Record<string, unknown> = {};
        if (dto.label !== undefined) patch.label = dto.label;
        if (dto.isEnabled !== undefined) patch.isEnabled = dto.isEnabled;
        if (dto.apiKey) {
            const encryptionKey = this.config.get<string>('encryptionKey')!;
            patch.apiKeyEncrypted = encrypt(dto.apiKey, encryptionKey);
        }

        const provider = await this.prisma.db.orm.public.AiProvider.where({ id }).update(patch);
        if (!provider) throw new NotFoundException('Provider not found');
        return this.toSafeProvider(provider);
    }

    async remove(userId: string, id: string) {
        await this.getOwned(userId, id);
        await this.prisma.db.orm.public.AiProvider.where({ id }).delete();
        return { message: 'Provider deleted' };
    }

    /** Internal use only — never expose decrypted keys through a controller. */
    async getDecryptedForInternalUse(userId: string, providerId?: string) {
        const provider = providerId
            ? await this.getOwned(userId, providerId)
            : await this.prisma.db.orm.public.AiProvider.where({ userId, isDefault: true }).first();

        if (!provider) throw new NotFoundException('No AI provider configured');
        if (!provider.isEnabled) throw new ForbiddenException('Selected provider is disabled');

        const encryptionKey = this.config.get<string>('encryptionKey')!;
        const apiKey = decrypt(provider.apiKeyEncrypted, encryptionKey);
        return { id: provider.id, type: provider.type, apiKey };
    }

    enable(userId: string, id: string) {
        return this.update(userId, id, { isEnabled: true });
    }

    disable(userId: string, id: string) {
        return this.update(userId, id, { isEnabled: false });
    }

    async setDefault(userId: string, id: string) {
        await this.getOwned(userId, id);

        const currentDefault = await this.prisma.db.orm.public.AiProvider.where({
            userId,
            isDefault: true,
        }).first();

        if (currentDefault && currentDefault.id !== id) {
            await this.prisma.db.orm.public.AiProvider.where({ id: currentDefault.id }).update({
                isDefault: false,
            });
        }

        const provider = await this.prisma.db.orm.public.AiProvider.where({ id }).update({
            isDefault: true,
        });
        if (!provider) throw new NotFoundException('Provider not found');
        return this.toSafeProvider(provider);
    }

    async healthCheck(userId: string, id: string) {
        const provider = await this.getOwned(userId, id);
        const encryptionKey = this.config.getOrThrow<string>('encryptionKey');
        const apiKey = decrypt(provider.apiKeyEncrypted, encryptionKey);

        let healthy = false;
        try {
            healthy = await this.pingProvider(provider.type, apiKey);
        } catch {
            healthy = false;
        }

        const updated = await this.prisma.db.orm.public.AiProvider.where({ id }).update({
            lastHealthStatus: healthy ? 'healthy' : 'unhealthy',
            lastHealthCheckAt: Temporal.Now.instant(),
        });

        if (!updated) throw new NotFoundException('Provider not found');
        return this.toSafeProvider(updated);
    }

    private async pingProvider(type: string, apiKey: string): Promise<boolean> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
            let response: Response;
            switch (type) {
                case 'OPENAI':
                    response = await fetch('https://api.openai.com/v1/models', {
                        headers: { Authorization: `Bearer ${apiKey}` },
                        signal: controller.signal,
                    });
                    break;
                case 'CLAUDE':
                    response = await fetch('https://api.anthropic.com/v1/models', {
                        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                        signal: controller.signal,
                    });
                    break;
                case 'GEMINI':
                    response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
                        { signal: controller.signal },
                    );
                    break;
                default:
                    return false;
            }
            return response.ok;
        } finally {
            clearTimeout(timeout);
        }
    }

    private async getOwned(userId: string, id: string) {
        const provider = await this.prisma.db.orm.public.AiProvider.where({ id }).first();
        if (!provider) throw new NotFoundException('Provider not found');
        if (provider.userId !== userId) throw new ForbiddenException('Not your provider');
        return provider;
    }

    private toSafeProvider(provider: Record<string, any>) {
        const { apiKeyEncrypted, ...rest } = provider;
        let apiKeyPreview = '••••••••';
        try {
            const encryptionKey = this.config.get<string>('encryptionKey')!;
            apiKeyPreview = maskKey(decrypt(apiKeyEncrypted, encryptionKey));
        } catch {
            // leave default mask if decryption fails
        }
        return { ...rest, apiKeyPreview };
    }
}
