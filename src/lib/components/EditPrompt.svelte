<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		top: number;
		left: number;
		onsubmit: (instruction: string) => void;
		oncancel: () => void;
	}

	let { top, left, onsubmit, oncancel }: Props = $props();

	let instruction = $state('');
	let inputEl: HTMLInputElement;

	onMount(() => {
		inputEl?.focus();
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && instruction.trim()) {
			e.preventDefault();
			onsubmit(instruction.trim());
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			oncancel();
		}
	}
</script>

<div
	class="fixed z-50 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
	style:top="{top}px"
	style:left="{left}px"
>
	<input
		bind:this={inputEl}
		bind:value={instruction}
		onkeydown={handleKeydown}
		type="text"
		placeholder="How should I edit this?"
		class="w-60 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
	/>
	<button
		type="button"
		class="rounded bg-gray-800 px-2.5 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
		disabled={!instruction.trim()}
		onclick={() => onsubmit(instruction.trim())}
	>
		Go
	</button>
	<button
		type="button"
		class="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
		onclick={oncancel}
	>
		✗
	</button>
</div>
