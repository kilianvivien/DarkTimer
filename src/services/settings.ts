import {
  type ApiKeyPersistenceMode,
  DEFAULT_BW_TEMP_C,
  DEFAULT_COLOR_TEMP_C,
  DEFAULT_SETTINGS,
  getDefaultTemperatureForMode,
  normalizeApiKeyPersistenceMode,
  normalizeAIProvider,
  normalizeSettings,
  type AIProvider,
  type PhaseCountdown,
  type UserSettings,
} from './userSettings';
import {
  getStoredSettings,
  saveStoredSettings,
} from './storage';

export type { AIProvider, ApiKeyPersistenceMode, PhaseCountdown, UserSettings } from './userSettings';
export {
  DEFAULT_BW_TEMP_C,
  DEFAULT_COLOR_TEMP_C,
  DEFAULT_SETTINGS,
  getDefaultTemperatureForMode,
  normalizeApiKeyPersistenceMode,
  normalizeAIProvider,
  normalizeSettings,
};

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
