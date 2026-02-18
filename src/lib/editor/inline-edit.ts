import { type Extension, StateField, StateEffect } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet, WidgetType, keymap } from '@codemirror/view';
import { buildEditRequest } from '$lib/ai/completion';
import { streamCompletion } from '$lib/ai/openrouter';

// --- State effects ---

export const startInlineEdit = StateEffect.define<{
	from: number;
	to: number;
	originalText: string;
}>();

const updateReplacement = StateEffect.define<string>();
const acceptEdit = StateEffect.define<void>();
const rejectEdit = StateEffect.define<void>();

// --- Widget for accept/reject buttons ---

class EditControlsWidget extends WidgetType {
	constructor(
		private onAccept: () => void,
		private onReject: () => void
	) {
		super();
	}

	toDOM(): HTMLElement {
		const wrapper = document.createElement('span');
		wrapper.className = 'cm-inline-edit-controls';
		wrapper.style.cssText = 'margin-left: 4px; user-select: none;';

		const accept = document.createElement('button');
		accept.textContent = '✓';
		accept.title = 'Accept edit';
		accept.style.cssText =
			'background: #22c55e; color: white; border: none; border-radius: 3px; padding: 0 6px; margin-right: 2px; cursor: pointer; font-size: 14px; line-height: 1.5;';
		accept.onmousedown = (e) => {
			e.preventDefault();
			this.onAccept();
		};

		const reject = document.createElement('button');
		reject.textContent = '✗';
		reject.title = 'Reject edit';
		reject.style.cssText =
			'background: #ef4444; color: white; border: none; border-radius: 3px; padding: 0 6px; cursor: pointer; font-size: 14px; line-height: 1.5;';
		reject.onmousedown = (e) => {
			e.preventDefault();
			this.onReject();
		};

		wrapper.appendChild(accept);
		wrapper.appendChild(reject);
		return wrapper;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

// --- State ---

interface InlineEditState {
	from: number;
	to: number;
	originalText: string;
	replacement: string;
	decorations: DecorationSet;
}

function buildDecorations(
	from: number,
	to: number,
	replacement: string,
	onAccept: () => void,
	onReject: () => void
): DecorationSet {
	const decos = [];

	// Highlight the replacement text range
	if (from < to) {
		decos.push(
			Decoration.mark({
				class: 'cm-inline-edit-preview',
				attributes: {
					style: 'background-color: #bbf7d0; border-radius: 2px;'
				}
			}).range(from, to)
		);
	}

	// Controls widget at the end
	decos.push(
		Decoration.widget({
			widget: new EditControlsWidget(onAccept, onReject),
			side: 1
		}).range(to)
	);

	return Decoration.set(decos);
}

// We need a reference to the view for dispatching from widget callbacks
let activeView: EditorView | null = null;

const inlineEditField = StateField.define<InlineEditState | null>({
	create() {
		return null;
	},
	update(value, tr) {
		for (const effect of tr.effects) {
			if (effect.is(startInlineEdit)) {
				const { from, to, originalText } = effect.value;
				return {
					from,
					to,
					originalText,
					replacement: '',
					decorations: Decoration.none
				};
			}
			if (effect.is(updateReplacement) && value) {
				const replacement = effect.value;
				// The original text has been replaced — the replacement occupies [from, from+replacement.length]
				const to = value.from + replacement.length;
				const decos = buildDecorations(
					value.from,
					to,
					replacement,
					() => activeView?.dispatch({ effects: acceptEdit.of(undefined) }),
					() => activeView?.dispatch({ effects: rejectEdit.of(undefined) })
				);
				return { ...value, replacement, to, decorations: decos };
			}
			if (effect.is(acceptEdit)) {
				// Text is already in the document — just clear the edit state
				return null;
			}
			if (effect.is(rejectEdit) && value) {
				return null; // The caller handles restoring original text
			}
		}
		return value;
	},
	provide(f) {
		return EditorView.decorations.from(f, (val) => val?.decorations ?? Decoration.none);
	}
});

// --- Commands ---

function dismissInlineEdit(view: EditorView): boolean {
	const editState = view.state.field(inlineEditField);
	if (!editState) return false;

	// Restore original text
	view.dispatch({
		changes: {
			from: editState.from,
			to: editState.from + editState.replacement.length,
			insert: editState.originalText
		},
		effects: rejectEdit.of(undefined)
	});
	return true;
}

// --- Public API ---

let activeAbort: AbortController | null = null;

export async function executeInlineEdit(
	view: EditorView,
	from: number,
	to: number,
	instruction: string,
	apiKey: string,
	model: string
): Promise<void> {
	// Cancel any in-flight edit
	if (activeAbort) {
		activeAbort.abort();
	}

	const originalText = view.state.sliceDoc(from, to);
	const abort = new AbortController();
	activeAbort = abort;
	activeView = view;

	// Start edit — replace selection with empty string initially, then stream in
	view.dispatch({
		changes: { from, to, insert: '' },
		effects: startInlineEdit.of({ from, to: from, originalText })
	});

	try {
		const request = buildEditRequest(model, originalText, instruction);
		let fullText = '';

		for await (const delta of streamCompletion(apiKey, request, abort.signal)) {
			if (abort.signal.aborted) return;
			const prevLen = fullText.length;
			fullText += delta;

			view.dispatch({
				changes: { from: from + prevLen, insert: delta },
				effects: updateReplacement.of(fullText)
			});
		}
	} catch (e) {
		if (e instanceof DOMException && e.name === 'AbortError') return;
		// On error, restore original
		const editState = view.state.field(inlineEditField);
		if (editState) {
			view.dispatch({
				changes: {
					from: editState.from,
					to: editState.from + editState.replacement.length,
					insert: editState.originalText
				},
				effects: rejectEdit.of(undefined)
			});
		}
	} finally {
		if (activeAbort === abort) {
			activeAbort = null;
		}
	}
}

export function acceptInlineEdit(view: EditorView): void {
	const editState = view.state.field(inlineEditField);
	if (editState) {
		view.dispatch({ effects: acceptEdit.of(undefined) });
	}
}

export function rejectInlineEdit(view: EditorView): void {
	dismissInlineEdit(view);
}

export function hasInlineEdit(view: EditorView): boolean {
	return view.state.field(inlineEditField) !== null;
}

export function cancelActiveEdit(): void {
	if (activeAbort) {
		activeAbort.abort();
		activeAbort = null;
	}
}

export function inlineEditExtension(): Extension {
	const keybindings = keymap.of([{ key: 'Escape', run: dismissInlineEdit }]);

	return [inlineEditField, keybindings];
}
