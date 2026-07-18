import type { ProcessMode } from './recipe';

export type AIProvider = 'gemini' | 'mistral';
export type ApiKeyPersistenceMode = 'session' | 'encrypted';

export type PhaseCountdown = 0 | 5 | 10;
export type AppTheme = 'dark' | 'safelight';
export type AgitationFlashMode = 'full' | 'border' | 'off';

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
  yoloRun: boolean;
  theme: AppTheme;
  /** Beep loudness, 0–1. Mapped to Web Audio gain in the timer. */
  cueVolume: number;
  agitationFlashMode: AgitationFlashMode;
  agitationVibrationEnabled: boolean;
  autoTrackChemRolls: boolean;
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
  yoloRun: false,
  theme: 'dark',
  cueVolume: 0.5,
  agitationFlashMode: 'full',
  agitationVibrationEnabled: false,
  autoTrackChemRolls: false,
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

export function normalizeAppTheme(value: unknown): AppTheme {
  return value === 'safelight' ? 'safelight' : 'dark';
}

function normalizeAgitationFlashMode(value: unknown, legacyEnabled: unknown): AgitationFlashMode {
  if (value === 'full' || value === 'border' || value === 'off') {
    return value;
  }

  // Migrate the pre-existing boolean setting.
  if (typeof legacyEnabled === 'boolean') {
    return legacyEnabled ? 'full' : 'off';
  }

  return DEFAULT_SETTINGS.agitationFlashMode;
}

function normalizeCueVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SETTINGS.cueVolume;
  }

  return Math.min(1, Math.max(0, value));
}

export function normalizeApiKeyPersistenceMode(value: unknown): ApiKeyPersistenceMode {
  return value === 'encrypted' ? 'encrypted' : 'session';
}

export function normalizeSettings(value: unknown): UserSettings {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const parsed = {
    ...DEFAULT_SETTINGS,
    ...raw,
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
    yoloRun:
      typeof parsed.yoloRun === 'boolean'
        ? parsed.yoloRun
        : DEFAULT_SETTINGS.yoloRun,
    theme: normalizeAppTheme(parsed.theme),
    cueVolume: normalizeCueVolume(parsed.cueVolume),
    // Read the raw values here: merging defaults first would mask the legacy
    // agitationFlashEnabled boolean with the default flash mode.
    agitationFlashMode: normalizeAgitationFlashMode(
      raw.agitationFlashMode,
      raw.agitationFlashEnabled,
    ),
    agitationVibrationEnabled:
      typeof parsed.agitationVibrationEnabled === 'boolean'
        ? parsed.agitationVibrationEnabled
        : DEFAULT_SETTINGS.agitationVibrationEnabled,
    autoTrackChemRolls:
      typeof parsed.autoTrackChemRolls === 'boolean'
        ? parsed.autoTrackChemRolls
        : DEFAULT_SETTINGS.autoTrackChemRolls,
  };
}

export function getDefaultTemperatureForMode(
  mode: ProcessMode,
  settings: UserSettings = DEFAULT_SETTINGS,
): number {
  return mode === 'bw' ? settings.defaultBwTempC : settings.defaultColorTempC;
}
