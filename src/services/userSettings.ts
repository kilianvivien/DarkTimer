import type { ProcessMode } from './recipe';

export type AIProvider = 'gemini' | 'mistral';
export type ApiKeyPersistenceMode = 'session' | 'encrypted';

export type PhaseCountdown = 0 | 5 | 10;

export interface UserSettings {
  defaultBwDeveloper: number;
  defaultStopBath: number;
  defaultFixer: number;
  defaultWash: number;
  defaultBwTempC: number;
  defaultColorDeveloper: number;
  defaultColorBlix: number;
  defaultColorWash: number;
  defaultColorTempC: number;
  notificationsEnabled: boolean;
  aiProvider: AIProvider;
  apiKeyPersistenceMode: ApiKeyPersistenceMode;
  phaseCountdown: PhaseCountdown;
  agitationFlashEnabled: boolean;
  agitationVibrationEnabled: boolean;
}

export const DEFAULT_BW_TEMP_C = 20;
export const DEFAULT_COLOR_TEMP_C = 38;

export const DEFAULT_SETTINGS: UserSettings = {
  defaultBwDeveloper: 360,
  defaultStopBath: 30,
  defaultFixer: 300,
  defaultWash: 600,
  defaultBwTempC: DEFAULT_BW_TEMP_C,
  defaultColorDeveloper: 210,
  defaultColorBlix: 480,
  defaultColorWash: 600,
  defaultColorTempC: DEFAULT_COLOR_TEMP_C,
  notificationsEnabled: false,
  aiProvider: 'gemini',
  apiKeyPersistenceMode: 'session',
  phaseCountdown: 10,
  agitationFlashEnabled: true,
  agitationVibrationEnabled: false,
};

function clampNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

export function normalizeAIProvider(value: unknown): AIProvider {
  return value === 'mistral' ? 'mistral' : 'gemini';
}

export function normalizeApiKeyPersistenceMode(value: unknown): ApiKeyPersistenceMode {
  return value === 'encrypted' ? 'encrypted' : 'session';
}

export function normalizeSettings(value: unknown): UserSettings {
  const parsed = {
    ...DEFAULT_SETTINGS,
    ...(typeof value === 'object' && value !== null ? value : {}),
  } as Record<string, unknown>;

  return {
    defaultStopBath: clampNumber(parsed.defaultStopBath, DEFAULT_SETTINGS.defaultStopBath),
    defaultFixer: clampNumber(parsed.defaultFixer, DEFAULT_SETTINGS.defaultFixer),
    defaultWash: clampNumber(parsed.defaultWash, DEFAULT_SETTINGS.defaultWash),
    defaultBwTempC: clampNumber(parsed.defaultBwTempC, DEFAULT_SETTINGS.defaultBwTempC),
    defaultColorTempC: clampNumber(parsed.defaultColorTempC, DEFAULT_SETTINGS.defaultColorTempC),
    defaultBwDeveloper: clampNumber(parsed.defaultBwDeveloper, DEFAULT_SETTINGS.defaultBwDeveloper),
    defaultColorDeveloper: clampNumber(parsed.defaultColorDeveloper, DEFAULT_SETTINGS.defaultColorDeveloper),
    defaultColorBlix: clampNumber(parsed.defaultColorBlix, DEFAULT_SETTINGS.defaultColorBlix),
    defaultColorWash: clampNumber(parsed.defaultColorWash, DEFAULT_SETTINGS.defaultColorWash),
    notificationsEnabled: Boolean(parsed.notificationsEnabled),
    aiProvider: normalizeAIProvider(parsed.aiProvider),
    apiKeyPersistenceMode: normalizeApiKeyPersistenceMode(parsed.apiKeyPersistenceMode),
    phaseCountdown: ([0, 5, 10] as PhaseCountdown[]).includes(parsed.phaseCountdown as PhaseCountdown)
      ? (parsed.phaseCountdown as PhaseCountdown)
      : DEFAULT_SETTINGS.phaseCountdown,
    agitationFlashEnabled:
      typeof parsed.agitationFlashEnabled === 'boolean'
        ? parsed.agitationFlashEnabled
        : DEFAULT_SETTINGS.agitationFlashEnabled,
    agitationVibrationEnabled:
      typeof parsed.agitationVibrationEnabled === 'boolean'
        ? parsed.agitationVibrationEnabled
        : DEFAULT_SETTINGS.agitationVibrationEnabled,
  };
}

export function getDefaultTemperatureForMode(
  mode: ProcessMode,
  settings: UserSettings = DEFAULT_SETTINGS,
): number {
  return mode === 'bw' ? settings.defaultBwTempC : settings.defaultColorTempC;
}
