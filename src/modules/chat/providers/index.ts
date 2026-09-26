import { sendOpenAiChat } from './openai.provider.js';
import { sendClaudeChat } from './claude.provider.js';
import { sendGeminiChat } from './gemini.provider.js';
import type { ChatAdapterMessage, ChatAdapterResult } from './openai.provider.js';

export type { ChatAdapterMessage, ChatAdapterResult };

export async function dispatchChat(
    providerType: string,
    apiKey: string,
    messages: ChatAdapterMessage[],
): Promise<ChatAdapterResult> {
    switch (providerType) {
        case 'OPENAI':
            return sendOpenAiChat(apiKey, messages);
        case 'CLAUDE':
            return sendClaudeChat(apiKey, messages);
        case 'GEMINI':
            return sendGeminiChat(apiKey, messages);
        default:
            throw new Error(`Unsupported provider type: ${providerType}`);
    }
}
