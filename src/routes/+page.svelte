<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';

	let content = $state('');
	let wordCount = $derived(content.trim() ? content.trim().split(/\s+/).length : 0);
	let charCount = $derived(content.length);
</script>

<svelte:head>
	<title>notepad#</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<div class="flex h-dvh flex-col bg-white">
	<header class="flex items-center justify-between border-b border-gray-200 px-4 py-2">
		<h1 class="text-lg font-semibold text-gray-800">notepad#</h1>
	</header>

	<main class="min-h-0 flex-1">
		<Editor {content} onchange={(value) => (content = value)} />
	</main>

	<footer class="border-t border-gray-200 px-4 py-1.5 text-xs text-gray-500">
		<span>{wordCount} words</span>
		<span class="mx-2">|</span>
		<span>{charCount} chars</span>
	</footer>
</div>
