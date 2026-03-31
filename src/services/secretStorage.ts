import type { AIProvider } from './userSettings';
import {
  clearLegacyStoredApiKeys,
  clearStoredEncryptedApiKeyVault,
  getLegacyStoredApiKeys,
  getStoredEncryptedApiKeyVault,
  initStorage,
  saveStoredEncryptedApiKeyVault,
  type EncryptedApiKeyVaultRecord,
} from './storage';

export interface ApiKeyState {
  apiKeys: Record<AIProvider, string>;
  hasEncryptedApiKeys: boolean;
  isLocked: boolean;
  isReady: boolean;
  migrationNotice: string | null;
}

const API_KEY_VAULT_VERSION = 1;
const PBKDF2_ITERATIONS = 250_000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const EMPTY_API_KEYS: Record<AIProvider, string> = {
  gemini: '',
  mistral: '',
};

const listeners = new Set<() => void>();

const state: ApiKeyState = {
  apiKeys: { ...EMPTY_API_KEYS },
  hasEncryptedApiKeys: false,
  isLocked: false,
  isReady: false,
  migrationNotice: null,
};

let initPromise: Promise<void> | null = null;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function cloneApiKeys(apiKeys: Record<AIProvider, string>): Record<AIProvider, string> {
  return {
    gemini: apiKeys.gemini,
    mistral: apiKeys.mistral,
  };
}

function normalizeApiKeys(apiKeys: Partial<Record<AIProvider, string>>): Record<AIProvider, string> {
  return {
    gemini: apiKeys.gemini?.trim() ?? '',
    mistral: apiKeys.mistral?.trim() ?? '',
  };
}

function hasAnyApiKeys(apiKeys: Record<AIProvider, string>): boolean {
  return Boolean(apiKeys.gemini || apiKeys.mistral);
}

function ensureCrypto(): Crypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Secure key storage requires Web Crypto support.');
  }

  return crypto;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64ToUint8Array(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function deriveEncryptionKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const subtle = ensureCrypto().subtle;
  const baseKey = await subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptApiKeys(
  passphrase: string,
  apiKeys: Record<AIProvider, string>,
): Promise<EncryptedApiKeyVaultRecord> {
  const cryptoApi = ensureCrypto();
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(passphrase, salt, PBKDF2_ITERATIONS);
  const ciphertext = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(JSON.stringify(apiKeys)),
  );

  return {
    version: API_KEY_VAULT_VERSION,
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptApiKeys(
  passphrase: string,
  vault: EncryptedApiKeyVaultRecord,
): Promise<Record<AIProvider, string>> {
  try {
    const key = await deriveEncryptionKey(
      passphrase,
      base64ToUint8Array(vault.salt),
      vault.iterations,
    );
    const plaintext = await ensureCrypto().subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToUint8Array(vault.iv) },
      key,
      base64ToUint8Array(vault.ciphertext),
    );

    return normalizeApiKeys(JSON.parse(textDecoder.decode(plaintext)) as Record<AIProvider, string>);
  } catch (error) {
    throw new Error('Passphrase is incorrect or the saved secure keys could not be unlocked.');
  }
}

export function getApiKeyStateSnapshot(): ApiKeyState {
  return {
    ...state,
    apiKeys: cloneApiKeys(state.apiKeys),
  };
}

export function subscribeToApiKeyState(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export async function migrateAndClearLegacyPlaintextKeys(): Promise<Record<AIProvider, string>> {
  const legacyApiKeys = normalizeApiKeys(await getLegacyStoredApiKeys());

  if (hasAnyApiKeys(legacyApiKeys)) {
    await clearLegacyStoredApiKeys();
  }

  return legacyApiKeys;
}

export async function initApiKeySession(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await initStorage();

      const [vault, migratedApiKeys] = await Promise.all([
        getStoredEncryptedApiKeyVault(),
        migrateAndClearLegacyPlaintextKeys(),
      ]);

      state.apiKeys = cloneApiKeys(migratedApiKeys);
      state.hasEncryptedApiKeys = Boolean(vault);
      state.isLocked = Boolean(vault) && !hasAnyApiKeys(migratedApiKeys);
      state.isReady = true;
      state.migrationNotice = hasAnyApiKeys(migratedApiKeys)
        ? 'Saved API keys were moved into this session only. Add a passphrase in Settings to remember them securely.'
        : null;
      emit();
    })();
  }

  return initPromise;
}

export function dismissApiKeyMigrationNotice(): void {
  if (!state.migrationNotice) {
    return;
  }

  state.migrationNotice = null;
  emit();
}

export async function setSessionApiKeys(apiKeys: Record<AIProvider, string>): Promise<void> {
  await initApiKeySession();
  state.apiKeys = normalizeApiKeys(apiKeys);
  state.isLocked = state.hasEncryptedApiKeys && !hasAnyApiKeys(state.apiKeys);
  emit();
}

export async function clearSessionApiKeys(): Promise<void> {
  await setSessionApiKeys(EMPTY_API_KEYS);
}

export function getSessionApiKeys(): Record<AIProvider, string> {
  return cloneApiKeys(state.apiKeys);
}

export async function hasEncryptedApiKeys(): Promise<boolean> {
  await initApiKeySession();
  return state.hasEncryptedApiKeys;
}

export async function unlockEncryptedApiKeys(
  passphrase: string,
): Promise<Record<AIProvider, string>> {
  await initApiKeySession();
  const vault = await getStoredEncryptedApiKeyVault();

  if (!vault) {
    throw new Error('No saved secure API keys were found on this device.');
  }

  const decryptedApiKeys = await decryptApiKeys(passphrase, vault);
  state.apiKeys = cloneApiKeys(decryptedApiKeys);
  state.hasEncryptedApiKeys = true;
  state.isLocked = false;
  emit();

  return decryptedApiKeys;
}

export async function saveEncryptedApiKeys(
  passphrase: string,
  apiKeys: Record<AIProvider, string>,
): Promise<void> {
  await initApiKeySession();
  const normalizedApiKeys = normalizeApiKeys(apiKeys);

  if (!hasAnyApiKeys(normalizedApiKeys)) {
    await clearStoredEncryptedApiKeyVault();
    state.hasEncryptedApiKeys = false;
    state.apiKeys = cloneApiKeys(normalizedApiKeys);
    state.isLocked = false;
    emit();
    return;
  }

  const encryptedVault = await encryptApiKeys(passphrase, normalizedApiKeys);
  await saveStoredEncryptedApiKeyVault(encryptedVault);

  state.hasEncryptedApiKeys = true;
  state.apiKeys = cloneApiKeys(normalizedApiKeys);
  state.isLocked = false;
  emit();
}

export async function clearEncryptedApiKeys(): Promise<void> {
  await initApiKeySession();
  await clearStoredEncryptedApiKeyVault();
  state.hasEncryptedApiKeys = false;
  state.isLocked = false;
  state.apiKeys = { ...EMPTY_API_KEYS };
  emit();
}

export function __resetApiKeyStateForTests(): void {
  initPromise = null;
  state.apiKeys = { ...EMPTY_API_KEYS };
  state.hasEncryptedApiKeys = false;
  state.isLocked = false;
  state.isReady = false;
  state.migrationNotice = null;
  listeners.clear();
}
