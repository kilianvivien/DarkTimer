import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { normalizeRecipe, type DevRecipe } from './recipe';
import type { Preset } from './presetTypes';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type AIProvider,
  type UserSettings,
} from './userSettings';

const DB_NAME = 'darktimer-db';
const DB_VERSION = 1;
const SETTINGS_KEY = 'user';

const LEGACY_SETTINGS_KEY = 'darktimer_settings';
const LEGACY_PRESETS_KEY = 'darktimer_presets';
const LEGACY_GEMINI_KEY = 'darktimer_gemini_key';
const LEGACY_MISTRAL_KEY = 'darktimer_mistral_key';

type StorageTopic = 'settings' | 'presets' | 'apiKeys';

interface SettingsRecord {
  key: typeof SETTINGS_KEY;
  value: UserSettings;
}

interface ApiKeyRecord {
  provider: AIProvider;
  key: string;
}

interface SessionRecord {
  id: string;
  startTime: number;
  endTime: number;
  film: string;
  status: 'completed' | 'partial' | 'aborted';
  recipe: DevRecipe;
  phasesCompleted: number;
  note?: string;
}

interface DarkTimerDB extends DBSchema {
  presets: {
    key: string;
    value: Preset;
    indexes: {
      film: string;
      developer: string;
      createdAt: number;
    };
  };
  settings: {
    key: string;
    value: SettingsRecord;
  };
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: {
      startTime: number;
      film: string;
    };
  };
  apiKeys: {
    key: string;
    value: ApiKeyRecord;
  };
}

const listeners: Record<StorageTopic, Set<() => void>> = {
  settings: new Set(),
  presets: new Set(),
  apiKeys: new Set(),
};

let dbPromise: Promise<IDBPDatabase<DarkTimerDB>> | null = null;
let initPromise: Promise<void> | null = null;

function getDb(): Promise<IDBPDatabase<DarkTimerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DarkTimerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('presets')) {
          const presets = db.createObjectStore('presets', { keyPath: 'id' });
          presets.createIndex('film', 'film');
          presets.createIndex('developer', 'developer');
          presets.createIndex('createdAt', 'createdAt');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('sessions')) {
          const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
          sessions.createIndex('startTime', 'startTime');
          sessions.createIndex('film', 'film');
        }

        if (!db.objectStoreNames.contains('apiKeys')) {
          db.createObjectStore('apiKeys', { keyPath: 'provider' });
        }
      },
    });
  }

  return dbPromise;
}

function emit(topic: StorageTopic): void {
  listeners[topic].forEach((listener) => listener());
}

export function subscribeToStorage(topic: StorageTopic, listener: () => void): () => void {
  listeners[topic].add(listener);

  return () => {
    listeners[topic].delete(listener);
  };
}

function normalizePreset(preset: unknown): Preset {
  const recipe = normalizeRecipe(preset);
  const raw = typeof preset === 'object' && preset !== null ? preset : {};
  const rawId = 'id' in raw ? raw.id : undefined;
  const rawCreatedAt = 'createdAt' in raw ? raw.createdAt : undefined;

  return {
    ...recipe,
    id: typeof rawId === 'string' && rawId.trim() ? rawId : crypto.randomUUID(),
    createdAt:
      typeof rawCreatedAt === 'number' && Number.isFinite(rawCreatedAt)
        ? rawCreatedAt
        : Date.now(),
  };
}

async function migrateLegacyStorage(): Promise<void> {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const legacySettings = localStorage.getItem(LEGACY_SETTINGS_KEY);
  const legacyPresets = localStorage.getItem(LEGACY_PRESETS_KEY);
  const legacyGeminiKey = localStorage.getItem(LEGACY_GEMINI_KEY);
  const legacyMistralKey = localStorage.getItem(LEGACY_MISTRAL_KEY);

  if (!legacySettings && !legacyPresets && !legacyGeminiKey && !legacyMistralKey) {
    return;
  }

  try {
    const db = await getDb();
    const tx = db.transaction(['settings', 'presets', 'apiKeys'], 'readwrite');

    if (legacySettings) {
      tx.objectStore('settings').put({
        key: SETTINGS_KEY,
        value: normalizeSettings(JSON.parse(legacySettings)),
      });
    }

    if (legacyPresets) {
      const parsed = JSON.parse(legacyPresets);
      if (Array.isArray(parsed)) {
        for (const preset of parsed) {
          tx.objectStore('presets').put(normalizePreset(preset));
        }
      }
    }

    if (legacyGeminiKey !== null) {
      tx.objectStore('apiKeys').put({ provider: 'gemini', key: legacyGeminiKey });
    }

    if (legacyMistralKey !== null) {
      tx.objectStore('apiKeys').put({ provider: 'mistral', key: legacyMistralKey });
    }

    await tx.done;

    localStorage.removeItem(LEGACY_SETTINGS_KEY);
    localStorage.removeItem(LEGACY_PRESETS_KEY);
    localStorage.removeItem(LEGACY_GEMINI_KEY);
    localStorage.removeItem(LEGACY_MISTRAL_KEY);
  } catch (error) {
    console.error('Failed to migrate legacy DarkTimer storage:', error);
  }
}

export function initStorage(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await getDb();
      await migrateLegacyStorage();
    })();
  }

  return initPromise;
}

export async function getStoredSettings(): Promise<UserSettings> {
  await initStorage();
  const db = await getDb();
  const record = await db.get('settings', SETTINGS_KEY);

  return record ? normalizeSettings(record.value) : DEFAULT_SETTINGS;
}

export async function saveStoredSettings(settings: UserSettings): Promise<UserSettings> {
  const normalized = normalizeSettings(settings);
  await initStorage();
  const db = await getDb();
  await db.put('settings', { key: SETTINGS_KEY, value: normalized });
  emit('settings');

  return normalized;
}

export async function getStoredApiKey(provider: AIProvider): Promise<string> {
  await initStorage();
  const db = await getDb();
  const record = await db.get('apiKeys', provider);
  return record?.key ?? '';
}

export async function getStoredApiKeys(): Promise<Record<AIProvider, string>> {
  const [gemini, mistral] = await Promise.all([
    getStoredApiKey('gemini'),
    getStoredApiKey('mistral'),
  ]);

  return { gemini, mistral };
}

export async function saveStoredApiKey(provider: AIProvider, key: string): Promise<void> {
  await initStorage();
  const db = await getDb();
  await db.put('apiKeys', { provider, key });
  emit('apiKeys');
}

export async function getStoredPresets(): Promise<Preset[]> {
  await initStorage();
  const db = await getDb();
  const presets = await db.getAll('presets');

  return presets
    .map((preset) => normalizePreset(preset))
    .sort((left, right) => right.createdAt - left.createdAt);
}

export async function saveStoredPreset(recipe: DevRecipe): Promise<Preset> {
  const preset: Preset = {
    ...normalizeRecipe(recipe),
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  await initStorage();
  const db = await getDb();
  await db.put('presets', preset);
  emit('presets');

  return preset;
}

export async function deleteStoredPreset(id: string): Promise<void> {
  await initStorage();
  const db = await getDb();
  await db.delete('presets', id);
  emit('presets');
}
