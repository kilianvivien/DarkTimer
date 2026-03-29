export interface UserSettings {
  defaultStopBath: number; // seconds
  defaultFixer: number; // seconds
  defaultWash: number; // seconds
  agitationDuration: number; // seconds (e.g. 5s)
  agitationInterval: number; // seconds (e.g. 60s)
  notificationsEnabled: boolean;
}

const STORAGE_KEY = 'darktimer_settings';
const GEMINI_KEY_STORAGE = 'darktimer_gemini_key';

export function getGeminiApiKey(): string {
  return localStorage.getItem(GEMINI_KEY_STORAGE) ?? '';
}

export function saveGeminiApiKey(key: string): void {
  localStorage.setItem(GEMINI_KEY_STORAGE, key);
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultStopBath: 30,
  defaultFixer: 300,
  defaultWash: 600,
  agitationDuration: 5,
  agitationInterval: 60,
  notificationsEnabled: false,
};

export function getSettings(): UserSettings {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
