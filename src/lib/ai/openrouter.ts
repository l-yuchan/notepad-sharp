export interface CompletionRequest {
	model: string;
	messages: Array<{ role: string; content: string }>;
	max_tokens?: number;
	temperature?: number;
	stop?: string[];
}

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function* streamCompletion(
	apiKey: string,
	request: CompletionRequest,
	signal?: AbortSignal
): AsyncGenerator<string> {
	const response = await fetch(API_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
			'X-Title': 'notepad#'
		},
		body: JSON.stringify({
			...request,
			stream: true
		}),
		signal
	});

	if (!response.ok) {
		const text = await response.text().catch(() => '');
		throw new Error(`OpenRouter API error ${response.status}: ${text}`);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('No response body');
	}

	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			// Keep the last potentially incomplete line in the buffer
			buffer = lines.pop() ?? '';

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith(':')) continue;
				if (trimmed === 'data: [DONE]') return;
				if (!trimmed.startsWith('data: ')) continue;

				try {
					const json = JSON.parse(trimmed.slice(6));
					const delta = json.choices?.[0]?.delta?.content;
					if (delta) {
						yield delta;
					}
				} catch {
					// Skip malformed JSON lines
				}
			}
		}

		// Process any remaining data in the buffer
		if (buffer.trim() && buffer.trim() !== 'data: [DONE]' && buffer.trim().startsWith('data: ')) {
			try {
				const json = JSON.parse(buffer.trim().slice(6));
				const delta = json.choices?.[0]?.delta?.content;
				if (delta) {
					yield delta;
				}
			} catch {
				// Skip malformed JSON
			}
		}
	} finally {
		reader.releaseLock();
	}
}
