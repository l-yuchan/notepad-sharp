<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		onundo?: () => void;
		onredo?: () => void;
		wordCount: number;
		charCount: number;
	}

	let { onundo, onredo, wordCount, charCount }: Props = $props();

	let keyboardVisible = $state(false);
	let toolbarEl: HTMLDivElement;
	let bottomOffset = $state(0);

	onMount(() => {
		const vv = window.visualViewport;
		if (!vv) return;

		function onViewportChange() {
			if (!vv) return;
			const offsetFromBottom = window.innerHeight - (vv.offsetTop + vv.height);
			keyboardVisible = offsetFromBottom > 100;
			bottomOffset = offsetFromBottom;
		}

		vv.addEventListener('resize', onViewportChange);
		vv.addEventListener('scroll', onViewportChange);

		return () => {
			vv.removeEventListener('resize', onViewportChange);
			vv.removeEventListener('scroll', onViewportChange);
		};
	});
</script>

<div
	bind:this={toolbarEl}
	class="border-t border-gray-200 bg-white px-2 py-1.5 transition-[bottom] duration-100"
	class:fixed={keyboardVisible}
	class:inset-x-0={keyboardVisible}
	style:bottom={keyboardVisible ? `${bottomOffset}px` : undefined}
	style:z-index={keyboardVisible ? 50 : undefined}
>
	<div class="flex items-center gap-1">
		{#if keyboardVisible}
			<button
				type="button"
				class="rounded px-2.5 py-1.5 text-sm text-gray-600 active:bg-gray-100"
				onclick={onundo}
				aria-label="Undo"
			>
				Undo
			</button>
			<button
				type="button"
				class="rounded px-2.5 py-1.5 text-sm text-gray-600 active:bg-gray-100"
				onclick={onredo}
				aria-label="Redo"
			>
				Redo
			</button>
			<div class="flex-1"></div>
		{/if}
		<span class="text-xs text-gray-500">
			{wordCount} words
			<span class="mx-1">|</span>
			{charCount} chars
		</span>
	</div>
</div>
