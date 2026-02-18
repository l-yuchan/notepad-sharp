const STORAGE_KEY_API_KEY = 'notepad-sharp:openrouter-api-key';
const STORAGE_KEY_MODEL = 'notepad-sharp:openrouter-model';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

function loadFromStorage(key: string, fallback: string): string {
	if (typeof window === 'undefined') return fallback;
	return localStorage.getItem(key) ?? fallback;
}

function saveToStorage(key: string, value: string): void {
	if (typeof window === 'undefined') return;
	if (value) {
		localStorage.setItem(key, value);
	} else {
		localStorage.removeItem(key);
	}
}

class SettingsStore {
	#apiKey = $state(loadFromStorage(STORAGE_KEY_API_KEY, ''));
	#model = $state(loadFromStorage(STORAGE_KEY_MODEL, DEFAULT_MODEL));

	get apiKey(): string {
		return this.#apiKey;
	}

	set apiKey(value: string) {
		this.#apiKey = value;
		saveToStorage(STORAGE_KEY_API_KEY, value);
	}

	get model(): string {
		return this.#model;
	}

	set model(value: string) {
		this.#model = value;
		saveToStorage(STORAGE_KEY_MODEL, value);
	}

	get isConfigured(): boolean {
		return this.#apiKey.length > 0 && this.#model.length > 0;
	}
}

export const settings = new SettingsStore();
