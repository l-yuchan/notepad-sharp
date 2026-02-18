import { type Extension, StateField, StateEffect, type TransactionSpec } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet, WidgetType, keymap } from '@codemirror/view';
import { buildCompletionRequest } from '$lib/ai/completion';
import { streamCompletion } from '$lib/ai/openrouter';

// --- State effects ---

const setGhostText = StateEffect.define<{ pos: number; text: string }>();
const clearGhostText = StateEffect.define<void>();

// --- Widget ---

class GhostTextWidget extends WidgetType {
	constructor(readonly text: string) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement('span');
		span.textContent = this.text;
		span.style.opacity = '0.4';
		span.style.pointerEvents = 'none';
		span.className = 'cm-ghost-text';
		return span;
	}

	eq(other: GhostTextWidget): boolean {
		return this.text === other.text;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

// --- State field ---

interface GhostState {
	pos: number;
	text: string;
	decorations: DecorationSet;
}

const ghostTextField = StateField.define<GhostState | null>({
	create() {
		return null;
	},
	update(value, tr) {
		for (const effect of tr.effects) {
			if (effect.is(setGhostText)) {
				const { pos, text } = effect.value;
				const deco = Decoration.set([
					Decoration.widget({
						widget: new GhostTextWidget(text),
						side: 1
					}).range(pos)
				]);
				return { pos, text, decorations: deco };
			}
			if (effect.is(clearGhostText)) {
				return null;
			}
		}
		// Clear ghost text on any document change or cursor movement
		if (tr.docChanged || tr.selection) {
			return null;
		}
		return value;
	},
	provide(f) {
		return EditorView.decorations.from(f, (val) => val?.decorations ?? Decoration.none);
	}
});

// --- Accept ghost text command ---

function acceptGhostText(view: EditorView): boolean {
	const ghost = view.state.field(ghostTextField);
	if (!ghost) return false;

	const { pos, text } = ghost;
	view.dispatch({
		changes: { from: pos, insert: text },
		effects: clearGhostText.of(undefined),
		selection: { anchor: pos + text.length }
	});
	return true;
}

function dismissGhostText(view: EditorView): boolean {
	const ghost = view.state.field(ghostTextField);
	if (!ghost) return false;

	view.dispatch({ effects: clearGhostText.of(undefined) });
	return true;
}

// --- Debounced completion logic ---

interface CompletionController {
	abort: AbortController | null;
	timeout: ReturnType<typeof setTimeout> | null;
}

function createCompletionRequester(
	getApiKey: () => string,
	getModel: () => string,
	debounceMs: number = 500
) {
	const controller: CompletionController = {
		abort: null,
		timeout: null
	};

	function cancel() {
		if (controller.timeout) {
			clearTimeout(controller.timeout);
			controller.timeout = null;
		}
		if (controller.abort) {
			controller.abort.abort();
			controller.abort = null;
		}
	}

	function requestCompletion(view: EditorView) {
		cancel();

		const apiKey = getApiKey();
		const model = getModel();
		if (!apiKey || !model) return;

		const state = view.state;
		const doc = state.doc.toString();
		if (doc.trim().length === 0) return;

		const cursorPos = state.selection.main.head;
		const textBefore = doc.slice(0, cursorPos);
		const textAfter = doc.slice(cursorPos);

		controller.timeout = setTimeout(async () => {
			const abort = new AbortController();
			controller.abort = abort;

			try {
				const request = buildCompletionRequest(model, textBefore, textAfter);
				let fullText = '';

				for await (const delta of streamCompletion(apiKey, request, abort.signal)) {
					if (abort.signal.aborted) return;
					fullText += delta;

					// Check that the cursor hasn't moved since we started
					const currentPos = view.state.selection.main.head;
					if (currentPos !== cursorPos) {
						abort.abort();
						return;
					}

					const spec: TransactionSpec = {
						effects: setGhostText.of({ pos: cursorPos, text: fullText })
					};
					view.dispatch(spec);
				}
			} catch (e) {
				if (e instanceof DOMException && e.name === 'AbortError') return;
				// Silently fail for network errors during completion
			}
		}, debounceMs);
	}

	return { requestCompletion, cancel };
}

// --- Extension factory ---

export interface GhostTextConfig {
	getApiKey: () => string;
	getModel: () => string;
	debounceMs?: number;
}

export function ghostTextExtension(config: GhostTextConfig): Extension {
	const { requestCompletion, cancel } = createCompletionRequester(
		config.getApiKey,
		config.getModel,
		config.debounceMs
	);

	const keybindings = keymap.of([
		{ key: 'Tab', run: acceptGhostText },
		{ key: 'Escape', run: dismissGhostText }
	]);

	const updateHandler = EditorView.updateListener.of((update) => {
		if (update.docChanged) {
			cancel();
			requestCompletion(update.view);
		} else if (update.selectionSet && !update.docChanged) {
			// Cursor moved without typing — cancel any pending request
			cancel();
		}
	});

	return [ghostTextField, keybindings, updateHandler];
}

// --- Public helpers for toolbar integration ---

export function hasGhostText(view: EditorView): boolean {
	return view.state.field(ghostTextField) !== null;
}

export function acceptGhostTextCommand(view: EditorView): void {
	acceptGhostText(view);
}

export { clearGhostText };
