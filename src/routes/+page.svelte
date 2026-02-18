<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import EditPrompt from '$lib/components/EditPrompt.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { hasGhostText, acceptGhostTextCommand } from '$lib/editor/ghost-text';
	import {
		executeInlineEdit,
		acceptInlineEdit,
		rejectInlineEdit,
		hasInlineEdit,
		cancelActiveEdit
	} from '$lib/editor/inline-edit';

	let editor: ReturnType<typeof Editor>;
	let content = $state('');
	let wordCount = $derived(content.trim() ? content.trim().split(/\s+/).length : 0);
	let charCount = $derived(content.length);
	let settingsOpen = $state(false);

	let ghostTextActive = $state(false);
	let selectionActive = $state(false);
	let selectionFrom = $state(0);
	let selectionTo = $state(0);
	let inlineEditActive = $state(false);

	let editPromptVisible = $state(false);
	let editPromptTop = $state(0);
	let editPromptLeft = $state(0);

	function handleSelectionChange(hasSelection: boolean, from: number, to: number) {
		selectionActive = hasSelection;
		selectionFrom = from;
		selectionTo = to;

		// Update ghost text and inline edit status
		const view = editor?.getView();
		if (view) {
			ghostTextActive = hasGhostText(view);
			inlineEditActive = hasInlineEdit(view);
		}
	}

	function handleContentChange(value: string) {
		content = value;
		// Check ghost text status after content changes
		const view = editor?.getView();
		if (view) {
			// Use a microtask so state effects have been applied
			queueMicrotask(() => {
				ghostTextActive = hasGhostText(view);
				inlineEditActive = hasInlineEdit(view);
			});
		}
	}

	function handleAcceptGhostText() {
		const view = editor?.getView();
		if (view) {
			acceptGhostTextCommand(view);
			ghostTextActive = false;
		}
	}

	function showEditPrompt() {
		const view = editor?.getView();
		if (!view || !selectionActive) return;

		// Position the prompt near the selection
		const coords = view.coordsAtPos(selectionFrom);
		if (coords) {
			editPromptTop = coords.top - 50;
			editPromptLeft = Math.max(8, Math.min(coords.left, window.innerWidth - 320));
		}
		editPromptVisible = true;
	}

	async function handleEditSubmit(instruction: string) {
		editPromptVisible = false;
		const view = editor?.getView();
		if (!view || !settings.isConfigured) return;

		await executeInlineEdit(
			view,
			selectionFrom,
			selectionTo,
			instruction,
			settings.apiKey,
			settings.model
		);
		inlineEditActive = hasInlineEdit(view);
	}

	function handleEditCancel() {
		editPromptVisible = false;
	}

	function handleAcceptEdit() {
		const view = editor?.getView();
		if (view) {
			acceptInlineEdit(view);
			inlineEditActive = false;
		}
	}

	function handleRejectEdit() {
		const view = editor?.getView();
		if (view) {
			cancelActiveEdit();
			rejectInlineEdit(view);
			inlineEditActive = false;
		}
	}

	function handleEditKeyboard(e: KeyboardEvent) {
		// Ctrl+E / Cmd+E to trigger edit
		if ((e.ctrlKey || e.metaKey) && e.key === 'e' && selectionActive && settings.isConfigured) {
			e.preventDefault();
			showEditPrompt();
		}
	}
</script>

<svelte:head>
	<title>notepad#</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex h-dvh flex-col bg-white" onkeydown={handleEditKeyboard}>
	<header class="flex items-center justify-between border-b border-gray-200 px-4 py-2">
		<h1 class="text-lg font-semibold text-gray-800">notepad#</h1>
		<button
			type="button"
			class="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
			onclick={() => (settingsOpen = true)}
			aria-label="Settings"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
				/>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
		</button>
	</header>

	<main class="min-h-0 flex-1">
		<Editor
			bind:this={editor}
			{content}
			onchange={handleContentChange}
			onselectionchange={handleSelectionChange}
			getApiKey={() => settings.apiKey}
			getModel={() => settings.model}
		/>
	</main>

	<Toolbar
		onundo={() => editor?.undo()}
		onredo={() => editor?.redo()}
		{wordCount}
		{charCount}
		hasGhostText={ghostTextActive}
		hasSelection={selectionActive && settings.isConfigured}
		hasInlineEdit={inlineEditActive}
		onaccept={handleAcceptGhostText}
		onedit={showEditPrompt}
		onacceptedit={handleAcceptEdit}
		onrejectedit={handleRejectEdit}
	/>
</div>

{#if editPromptVisible}
	<EditPrompt
		top={editPromptTop}
		left={editPromptLeft}
		onsubmit={handleEditSubmit}
		oncancel={handleEditCancel}
	/>
{/if}

<Settings open={settingsOpen} onclose={() => (settingsOpen = false)} />
