<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let apiKey = $state(settings.apiKey);
	let model = $state(settings.model);
	let availableModels: string[] = $state([]);
	let fetchingModels = $state(false);

	function save() {
		settings.apiKey = apiKey;
		settings.model = model;
		onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	async function fetchModels() {
		if (!apiKey) return;
		fetchingModels = true;
		try {
			const res = await fetch('https://openrouter.ai/api/v1/models', {
				headers: { Authorization: `Bearer ${apiKey}` }
			});
			if (res.ok) {
				const data = await res.json();
				availableModels = (data.data ?? [])
					.map((m: { id: string }) => m.id)
					.sort((a: string, b: string) => a.localeCompare(b));
			}
		} catch {
			// Silently fail — user can still type a model name manually
		} finally {
			fetchingModels = false;
		}
	}

	$effect(() => {
		if (open) {
			apiKey = settings.apiKey;
			model = settings.model;
			availableModels = [];
		}
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
		role="dialog"
		aria-modal="true"
		aria-label="Settings"
		onkeydown={handleKeydown}
		onclick={handleBackdropClick}
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-sm:fixed max-sm:inset-0 max-sm:max-w-none max-sm:rounded-none"
		>
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-gray-800">Settings</h2>
				<button
					type="button"
					class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
					onclick={onclose}
					aria-label="Close settings"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="api-key" class="mb-1 block text-sm font-medium text-gray-700">
						OpenRouter API Key
					</label>
					<input
						id="api-key"
						type="password"
						bind:value={apiKey}
						placeholder="sk-or-..."
						class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
					<p class="mt-1 text-xs text-gray-500">
						Stored locally in your browser. Never sent to our server.
					</p>
				</div>

				<div>
					<label for="model" class="mb-1 block text-sm font-medium text-gray-700">Model</label>
					<div class="flex gap-2">
						<input
							id="model"
							type="text"
							bind:value={model}
							placeholder="openai/gpt-4o-mini"
							list="model-list"
							class="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
						<button
							type="button"
							class="shrink-0 rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
							onclick={fetchModels}
							disabled={!apiKey || fetchingModels}
						>
							{fetchingModels ? 'Loading...' : 'Fetch'}
						</button>
					</div>
					{#if availableModels.length > 0}
						<datalist id="model-list">
							{#each availableModels as m}
								<option value={m}></option>
							{/each}
						</datalist>
					{/if}
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-2">
				<button
					type="button"
					class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
					onclick={onclose}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
					onclick={save}
				>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}
