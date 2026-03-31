import {
  DEFAULT_BW_TEMP_C,
  DEFAULT_COLOR_TEMP_C,
  DEFAULT_SETTINGS,
  getDefaultTemperatureForMode,
  normalizeAIProvider,
  normalizeSettings,
  type AIProvider,
  type PhaseCountdown,
  type UserSettings,
} from './userSettings';
import {
  getStoredApiKey,
  getStoredSettings,
  saveStoredApiKey,
  saveStoredSettings,
} from './storage';

export type { AIProvider, PhaseCountdown, UserSettings } from './userSettings';
export {
  DEFAULT_BW_TEMP_C,
  DEFAULT_COLOR_TEMP_C,
  DEFAULT_SETTINGS,
  getDefaultTemperatureForMode,
  normalizeAIProvider,
  normalizeSettings,
};

export function getGeminiApiKey(): Promise<string> {
  return getStoredApiKey('gemini');
}

export function saveGeminiApiKey(key: string): Promise<void> {
  return saveStoredApiKey('gemini', key);
}

export function getMistralApiKey(): Promise<string> {
  return getStoredApiKey('mistral');
}

export function saveMistralApiKey(key: string): Promise<void> {
  return saveStoredApiKey('mistral', key);
}

export function getSettings(): Promise<UserSettings> {
  return getStoredSettings();
}

export function saveSettings(settings: UserSettings): Promise<UserSettings> {
  return saveStoredSettings(settings);
}

export async function saveAiProvider(aiProvider: AIProvider): Promise<UserSettings> {
  const settings = await getSettings();

  return saveSettings({
    ...settings,
    aiProvider,
  });
}
