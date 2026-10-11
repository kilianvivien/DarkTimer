import {
  DEFAULT_SETTINGS,
  getDefaultTemperatureForMode,
  type AIProvider,
  type UserSettings,
} from './userSettings';
import {
  getStoredSettings,
  saveStoredSettings,
} from './storage';

export type {
  AIProvider,
  AgitationFlashMode,
  ApiKeyPersistenceMode,
  AppTheme,
  PhaseCountdown,
  UserSettings,
} from './userSettings';
export { DEFAULT_SETTINGS, getDefaultTemperatureForMode };

export function saveSettings(settings: UserSettings): Promise<UserSettings> {
  return saveStoredSettings(settings);
}

export async function saveAiProvider(aiProvider: AIProvider): Promise<UserSettings> {
  const settings = await getStoredSettings();

  return saveSettings({
    ...settings,
    aiProvider,
  });
}
