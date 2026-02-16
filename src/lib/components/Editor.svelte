<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorState } from '@codemirror/state';
	import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
	import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
	import { languages } from '@codemirror/language-data';
	import {
		defaultKeymap,
		history,
		historyKeymap,
		undo as cmUndo,
		redo as cmRedo
	} from '@codemirror/commands';

	interface Props {
		content?: string;
		onchange?: (value: string) => void;
	}

	let { content = '', onchange }: Props = $props();

	let editorContainer: HTMLDivElement;
	let view: EditorView | undefined = $state();

	const theme = EditorView.theme({
		'&': {
			height: '100%',
			fontSize: '16px'
		},
		'.cm-scroller': {
			overflow: 'auto',
			fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace'
		},
		'.cm-content': {
			padding: '16px 0',
			minHeight: '100%'
		},
		'.cm-line': {
			padding: '0 16px'
		},
		'.cm-gutters': {
			backgroundColor: 'transparent',
			border: 'none',
			color: '#94a3b8'
		},
		'&.cm-focused': {
			outline: 'none'
		}
	});

	onMount(() => {
		const updateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				onchange?.(update.state.doc.toString());
			}
		});

		const state = EditorState.create({
			doc: content,
			extensions: [
				lineNumbers(),
				highlightActiveLine(),
				history(),
				keymap.of([...defaultKeymap, ...historyKeymap]),
				markdown({ base: markdownLanguage, codeLanguages: languages }),
				updateListener,
				theme,
				EditorView.lineWrapping
			]
		});

		view = new EditorView({
			state,
			parent: editorContainer
		});

		return () => {
			view?.destroy();
		};
	});

	export function undo(): void {
		if (view) cmUndo(view);
	}

	export function redo(): void {
		if (view) cmRedo(view);
	}

	export function getView(): EditorView | undefined {
		return view;
	}
</script>

<div bind:this={editorContainer} class="h-full w-full"></div>
