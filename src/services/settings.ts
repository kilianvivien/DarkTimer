import { DEFAULT_BW_TEMP_C, DEFAULT_COLOR_TEMP_C, ProcessMode } from './recipe';

export type AIProvider = 'gemini' | 'mistral';

export interface UserSettings {
  defaultStopBath: number; // seconds
  defaultFixer: number; // seconds
  defaultWash: number; // seconds
  defaultBwTempC: number;
  defaultColorTempC: number;
  notificationsEnabled: boolean;
  aiProvider: AIProvider;
}

const STORAGE_KEY = 'darktimer_settings';
const GEMINI_KEY_STORAGE = 'darktimer_gemini_key';
const MISTRAL_KEY_STORAGE = 'darktimer_mistral_key';

function normalizeAIProvider(value: unknown): AIProvider {
  return value === 'mistral' ? 'mistral' : 'gemini';
}

export function getGeminiApiKey(): string {
  return localStorage.getItem(GEMINI_KEY_STORAGE) ?? '';
}

export function saveGeminiApiKey(key: string): void {
  localStorage.setItem(GEMINI_KEY_STORAGE, key);
}

export function getMistralApiKey(): string {
  return localStorage.getItem(MISTRAL_KEY_STORAGE) ?? '';
}

export function saveMistralApiKey(key: string): void {
  localStorage.setItem(MISTRAL_KEY_STORAGE, key);
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultStopBath: 30,
  defaultFixer: 300,
  defaultWash: 600,
  defaultBwTempC: DEFAULT_BW_TEMP_C,
  defaultColorTempC: DEFAULT_COLOR_TEMP_C,
  notificationsEnabled: false,
  aiProvider: 'gemini',
};

function clampNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

export function getSettings(): UserSettings {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_SETTINGS;

  try {
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };

    return {
      defaultStopBath: clampNumber(parsed.defaultStopBath, DEFAULT_SETTINGS.defaultStopBath),
      defaultFixer: clampNumber(parsed.defaultFixer, DEFAULT_SETTINGS.defaultFixer),
      defaultWash: clampNumber(parsed.defaultWash, DEFAULT_SETTINGS.defaultWash),
      defaultBwTempC: clampNumber(parsed.defaultBwTempC, DEFAULT_SETTINGS.defaultBwTempC),
      defaultColorTempC: clampNumber(parsed.defaultColorTempC, DEFAULT_SETTINGS.defaultColorTempC),
      notificationsEnabled: Boolean(parsed.notificationsEnabled),
      aiProvider: normalizeAIProvider(parsed.aiProvider),
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function saveAiProvider(aiProvider: AIProvider): void {
  saveSettings({
    ...getSettings(),
    aiProvider,
  });
}

export function getDefaultTemperatureForMode(
  mode: ProcessMode,
  settings: UserSettings = getSettings(),
): number {
  return mode === 'bw' ? settings.defaultBwTempC : settings.defaultColorTempC;
}
