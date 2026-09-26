import type { ChatAdapterMessage, ChatAdapterResult } from './openai.provider.js';

export async function sendGeminiChat(
    apiKey: string,
    messages: ChatAdapterMessage[],
): Promise<ChatAdapterResult> {
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
    );

    if (!response.ok) {
        throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
        tokensUsed: data.usageMetadata?.totalTokenCount,
    };
}
