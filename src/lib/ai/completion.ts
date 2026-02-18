import type { CompletionRequest } from './openrouter';

const MAX_CONTEXT_CHARS = 2000;

const COMPLETION_SYSTEM_PROMPT = `You are a text completion assistant. Continue the text naturally from where the cursor is.
Only output the completion text, nothing else. Keep it brief (1-3 sentences).`;

const EDIT_SYSTEM_PROMPT = `You are a text editing assistant. Rewrite the given text according to the user's instruction.
Only output the rewritten text, nothing else.`;

export function buildCompletionRequest(
	model: string,
	textBefore: string,
	textAfter: string
): CompletionRequest {
	const before = textBefore.slice(-MAX_CONTEXT_CHARS);
	const after = textAfter.slice(0, MAX_CONTEXT_CHARS);

	let userContent = before + '\n\n<<<CURSOR>>>\n\n';
	if (after.trim()) {
		userContent += after + '\n\n';
	}
	userContent += 'Continue from <<<CURSOR>>>.';

	return {
		model,
		messages: [
			{ role: 'system', content: COMPLETION_SYSTEM_PROMPT },
			{ role: 'user', content: userContent }
		],
		max_tokens: 256,
		temperature: 0.7,
		stop: ['\n\n\n']
	};
}

export function buildEditRequest(
	model: string,
	selectedText: string,
	instruction: string
): CompletionRequest {
	return {
		model,
		messages: [
			{ role: 'system', content: EDIT_SYSTEM_PROMPT },
			{
				role: 'user',
				content: `Instruction: ${instruction}\n\nText to edit:\n${selectedText}`
			}
		],
		max_tokens: 1024,
		temperature: 0.7
	};
}
