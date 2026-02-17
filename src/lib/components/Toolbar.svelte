<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		onundo?: () => void;
		onredo?: () => void;
		onaccept?: () => void;
		onedit?: () => void;
		wordCount: number;
		charCount: number;
		hasGhostText?: boolean;
		hasSelection?: boolean;
		hasInlineEdit?: boolean;
		onacceptedit?: () => void;
		onrejectedit?: () => void;
	}

	let {
		onundo,
		onredo,
		onaccept,
		onedit,
		wordCount,
		charCount,
		hasGhostText = false,
		hasSelection = false,
		hasInlineEdit = false,
		onacceptedit,
		onrejectedit
	}: Props = $props();

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
		{/if}

		{#if hasGhostText}
			<button
				type="button"
				class="rounded bg-blue-50 px-2.5 py-1.5 text-sm text-blue-700 active:bg-blue-100"
				onclick={onaccept}
				aria-label="Accept suggestion"
			>
				Accept
			</button>
		{/if}

		{#if hasSelection && !hasInlineEdit}
			<button
				type="button"
				class="rounded bg-purple-50 px-2.5 py-1.5 text-sm text-purple-700 active:bg-purple-100"
				onclick={onedit}
				aria-label="Edit with AI"
			>
				Edit
			</button>
		{/if}

		{#if hasInlineEdit}
			<button
				type="button"
				class="rounded bg-green-50 px-2.5 py-1.5 text-sm text-green-700 active:bg-green-100"
				onclick={onacceptedit}
				aria-label="Accept edit"
			>
				Accept
			</button>
			<button
				type="button"
				class="rounded bg-red-50 px-2.5 py-1.5 text-sm text-red-700 active:bg-red-100"
				onclick={onrejectedit}
				aria-label="Reject edit"
			>
				Reject
			</button>
		{/if}

		<div class="flex-1"></div>
		<span class="text-xs text-gray-500">
			{wordCount} words
			<span class="mx-1">|</span>
			{charCount} chars
		</span>
	</div>
</div>
