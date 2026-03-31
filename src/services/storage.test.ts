import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from './userSettings';

async function loadStorage() {
  vi.resetModules();
  return import('./storage');
}

describe('storage service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('migrates legacy settings and presets from localStorage', async () => {
    localStorage.setItem(
      'darktimer_settings',
      JSON.stringify({ aiProvider: 'mistral', defaultStopBath: 45 }),
    );
    localStorage.setItem(
      'darktimer_presets',
      JSON.stringify([
        {
          film: 'HP5',
          developer: 'ID-11',
          dilution: '1+1',
          iso: 400,
          tempC: 20,
          processMode: 'bw',
          phases: [],
          notes: 'legacy',
        },
      ]),
    );

    const storage = await loadStorage();
    await storage.initStorage();

    await expect(storage.getStoredSettings()).resolves.toMatchObject({
      aiProvider: 'mistral',
      defaultStopBath: 45,
    });
    await expect(storage.getStoredPresets()).resolves.toHaveLength(1);
    expect(localStorage.getItem('darktimer_settings')).toBeNull();
    expect(localStorage.getItem('darktimer_presets')).toBeNull();
  });

  it('persists settings and presets in IndexedDB', async () => {
    const storage = await loadStorage();
    const nowSpy = vi.spyOn(Date, 'now');

    await storage.saveStoredSettings({ ...DEFAULT_SETTINGS, aiProvider: 'mistral' });

    nowSpy.mockReturnValue(100);
    const firstPreset = await storage.saveStoredPreset({
      film: 'First',
      developer: 'Dev',
      dilution: '1+1',
      iso: 400,
      tempC: 20,
      processMode: 'bw',
      phases: [],
      notes: '',
    });

    nowSpy.mockReturnValue(200);
    const secondPreset = await storage.saveStoredPreset({
      film: 'Second',
      developer: 'Dev',
      dilution: '1+1',
      iso: 400,
      tempC: 20,
      processMode: 'bw',
      phases: [],
      notes: '',
    });

    await expect(storage.getStoredSettings()).resolves.toMatchObject({ aiProvider: 'mistral' });
    await expect(storage.getStoredPresets()).resolves.toMatchObject([
      { id: secondPreset.id, film: 'Second' },
      { id: firstPreset.id, film: 'First' },
    ]);
    expect(firstPreset.createdAt).toBe(100);
    expect(secondPreset.createdAt).toBe(200);

    await storage.deleteStoredPreset(firstPreset.id);
    await expect(storage.getStoredPresets()).resolves.toHaveLength(1);
  });

  it('reads and clears encrypted API key vault records', async () => {
    const storage = await loadStorage();
    const vault = {
      version: 1,
      kdf: 'PBKDF2-SHA-256' as const,
      iterations: 250000,
      salt: 'salt',
      iv: 'iv',
      ciphertext: 'cipher',
    };

    await storage.saveStoredEncryptedApiKeyVault(vault);
    await expect(storage.getStoredEncryptedApiKeyVault()).resolves.toEqual(vault);

    await storage.clearStoredEncryptedApiKeyVault();
    await expect(storage.getStoredEncryptedApiKeyVault()).resolves.toBeNull();
  });
});
