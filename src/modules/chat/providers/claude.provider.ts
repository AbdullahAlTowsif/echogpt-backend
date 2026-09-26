import type { ChatAdapterMessage, ChatAdapterResult } from './openai.provider.js';

export async function sendClaudeChat(
    apiKey: string,
    messages: ChatAdapterMessage[],
): Promise<ChatAdapterResult> {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const conversation = messages.filter((m) => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: system || undefined,
            messages: conversation.map((m) => ({ role: m.role, content: m.content })),
        }),
    });

    if (!response.ok) {
        throw new Error(`Claude request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return {
        content: data.content?.[0]?.text ?? '',
        tokensUsed: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    };
}
