import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { normalizeRecipe, type DevRecipe, type Session, type SessionStatus } from './recipe';
import type { Preset } from './presetTypes';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type AIProvider,
  type UserSettings,
} from './userSettings';

const DB_NAME = 'darktimer-db';
const DB_VERSION = 3;
const SETTINGS_KEY = 'user';
const ENCRYPTED_API_VAULT_KEY = 'apiKeys';

const LEGACY_SETTINGS_KEY = 'darktimer_settings';
const LEGACY_PRESETS_KEY = 'darktimer_presets';
const LEGACY_GEMINI_KEY = 'darktimer_gemini_key';
const LEGACY_MISTRAL_KEY = 'darktimer_mistral_key';

type StorageTopic = 'settings' | 'presets' | 'sessions';

interface SettingsRecord {
  key: typeof SETTINGS_KEY;
  value: UserSettings;
}

interface ApiKeyRecord {
  provider: AIProvider;
  key: string;
}

export interface EncryptedApiKeyVaultRecord {
  version: number;
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
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
    value: Session;
    indexes: {
      startTime: number;
      film: string;
    };
  };
  apiKeys: {
    key: string;
    value: ApiKeyRecord;
  };
  secureVault: {
    key: string;
    value: EncryptedApiKeyVaultRecord;
  };
}

const listeners: Record<StorageTopic, Set<() => void>> = {
  settings: new Set(),
  presets: new Set(),
  sessions: new Set(),
};

let dbPromise: Promise<IDBPDatabase<DarkTimerDB>> | null = null;
let initPromise: Promise<void> | null = null;

function getDb(): Promise<IDBPDatabase<DarkTimerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DarkTimerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
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
          sessions.createIndex('film', 'recipe.film');
        } else if (oldVersion < 3) {
          const sessions = transaction.objectStore('sessions');
          if (sessions.indexNames.contains('film')) {
            sessions.deleteIndex('film');
          }
          sessions.createIndex('film', 'recipe.film');
        }

        if (!db.objectStoreNames.contains('apiKeys')) {
          db.createObjectStore('apiKeys', { keyPath: 'provider' });
        }

        if (!db.objectStoreNames.contains('secureVault')) {
          db.createObjectStore('secureVault');
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

function normalizeSessionStatus(value: unknown): SessionStatus {
  if (value === 'completed' || value === 'partial' || value === 'aborted') {
    return value;
  }

  return 'aborted';
}

function normalizeSession(session: unknown): Session {
  const raw = typeof session === 'object' && session !== null ? session : {};
  const rawId = 'id' in raw ? raw.id : undefined;
  const rawRecipe = 'recipe' in raw ? raw.recipe : undefined;
  const rawStartTime = 'startTime' in raw ? raw.startTime : undefined;
  const rawEndTime = 'endTime' in raw ? raw.endTime : undefined;
  const rawStatus = 'status' in raw ? raw.status : undefined;
  const rawPhasesCompleted = 'phasesCompleted' in raw ? raw.phasesCompleted : undefined;
  const startTime =
    typeof rawStartTime === 'number' && Number.isFinite(rawStartTime) ? rawStartTime : Date.now();
  const endTime =
    typeof rawEndTime === 'number' && Number.isFinite(rawEndTime) ? rawEndTime : startTime;

  return {
    id: typeof rawId === 'string' && rawId.trim() ? rawId : crypto.randomUUID(),
    recipe: normalizeRecipe(rawRecipe),
    startTime,
    endTime,
    status: normalizeSessionStatus(rawStatus),
    phasesCompleted:
      typeof rawPhasesCompleted === 'number' && Number.isFinite(rawPhasesCompleted)
        ? Math.max(0, Math.round(rawPhasesCompleted))
        : 0,
  };
}

async function migrateLegacyStorage(): Promise<void> {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const legacySettings = localStorage.getItem(LEGACY_SETTINGS_KEY);
  const legacyPresets = localStorage.getItem(LEGACY_PRESETS_KEY);

  if (!legacySettings && !legacyPresets) {
    return;
  }

  try {
    const db = await getDb();
    const tx = db.transaction(['settings', 'presets'], 'readwrite');

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

    await tx.done;

    localStorage.removeItem(LEGACY_SETTINGS_KEY);
    localStorage.removeItem(LEGACY_PRESETS_KEY);
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

export async function getLegacyStoredApiKey(provider: AIProvider): Promise<string> {
  await initStorage();
  const db = await getDb();
  const record = await db.get('apiKeys', provider);
  const legacyKey = record?.key ?? '';

  if (legacyKey) {
    return legacyKey;
  }

  if (typeof localStorage === 'undefined') {
    return '';
  }

  const storageKey = provider === 'gemini' ? LEGACY_GEMINI_KEY : LEGACY_MISTRAL_KEY;
  return localStorage.getItem(storageKey) ?? '';
}

export async function getLegacyStoredApiKeys(): Promise<Record<AIProvider, string>> {
  const [gemini, mistral] = await Promise.all([
    getLegacyStoredApiKey('gemini'),
    getLegacyStoredApiKey('mistral'),
  ]);

  return { gemini, mistral };
}

export async function clearLegacyStoredApiKeys(): Promise<void> {
  await initStorage();
  const db = await getDb();

  await Promise.all([
    db.delete('apiKeys', 'gemini'),
    db.delete('apiKeys', 'mistral'),
  ]);

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(LEGACY_GEMINI_KEY);
    localStorage.removeItem(LEGACY_MISTRAL_KEY);
  }
}

export async function getStoredEncryptedApiKeyVault(): Promise<EncryptedApiKeyVaultRecord | null> {
  await initStorage();
  const db = await getDb();
  const record = await db.get('secureVault', ENCRYPTED_API_VAULT_KEY);
  return record ?? null;
}

export async function saveStoredEncryptedApiKeyVault(
  record: EncryptedApiKeyVaultRecord,
): Promise<void> {
  await initStorage();
  const db = await getDb();
  await db.put('secureVault', record, ENCRYPTED_API_VAULT_KEY);
}

export async function clearStoredEncryptedApiKeyVault(): Promise<void> {
  await initStorage();
  const db = await getDb();
  await db.delete('secureVault', ENCRYPTED_API_VAULT_KEY);
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

export async function getStoredSessions(): Promise<Session[]> {
  await initStorage();
  const db = await getDb();
  const sessions = await db.getAll('sessions');

  return sessions
    .map((session) => normalizeSession(session))
    .sort((left, right) => right.startTime - left.startTime);
}

export async function saveStoredSession(session: Session): Promise<Session> {
  const normalized = normalizeSession(session);
  await initStorage();
  const db = await getDb();
  await db.put('sessions', normalized);
  emit('sessions');

  return normalized;
}

export async function clearStoredSessions(): Promise<void> {
  await initStorage();
  const db = await getDb();
  await db.clear('sessions');
  emit('sessions');
}

export async function __resetStorageForTests(): Promise<void> {
  listeners.settings.clear();
  listeners.presets.clear();
  listeners.sessions.clear();

  if (dbPromise) {
    const db = await dbPromise.catch(() => null);
    db?.close();
  }

  dbPromise = null;
  initPromise = null;

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
  });
}
