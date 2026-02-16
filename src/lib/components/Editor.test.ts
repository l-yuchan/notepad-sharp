import { describe, it, expect } from 'vitest';

describe('Editor', () => {
	it('should be importable', async () => {
		const module = await import('./Editor.svelte');
		expect(module.default).toBeDefined();
	});
});
