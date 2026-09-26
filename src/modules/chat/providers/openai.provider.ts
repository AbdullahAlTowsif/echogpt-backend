export interface ChatAdapterMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatAdapterResult {
    content: string;
    tokensUsed?: number;
}

export async function sendOpenAiChat(
    apiKey: string,
    messages: ChatAdapterMessage[],
): Promise<ChatAdapterResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return {
        content: data.choices?.[0]?.message?.content ?? '',
        tokensUsed: data.usage?.total_tokens,
    };
}
