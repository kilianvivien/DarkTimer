import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from './userSettings';

async function loadModules() {
  vi.resetModules();
  const storage = await import('./storage');
  const backup = await import('./backup');
  return { storage, backup };
}

const recipe = {
  film: 'HP5 Plus',
  developer: 'ID-11',
  dilution: '1+1',
  iso: 400,
  tempC: 20,
  processMode: 'bw' as const,
  phases: [{ name: 'Developer', duration: 780, agitationMode: 'every-60s' as const }],
  notes: '',
};

describe('backup service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('round-trips presets, sessions, chems and settings without API keys', async () => {
    const { storage, backup } = await loadModules();

    await storage.saveStoredSettings({ ...DEFAULT_SETTINGS, defaultStopBath: 45 });
    await storage.saveStoredPreset(recipe);
    await storage.saveStoredSession({
      id: 'session-1',
      recipe,
      startTime: 1000,
      endTime: 2000,
      status: 'completed',
      phasesCompleted: 1,
      outcome: 'dense',
      logNotes: 'Cut 10% next time.',
    });
    await storage.saveStoredChem({
      name: 'ID-11',
      type: 'developer',
      processMode: 'bw',
      mixDate: 1000,
      expirationDate: null,
      rollCount: 2,
      maxRolls: 10,
      notes: '',
    });
    await storage.saveStoredEncryptedApiKeyVault({
      version: 1,
      kdf: 'PBKDF2-SHA-256',
      iterations: 1,
      salt: 'salt',
      iv: 'iv',
      ciphertext: 'secret-ciphertext',
    });

    const text = JSON.stringify(await backup.createBackup());
    expect(text).not.toContain('secret-ciphertext');

    await storage.clearAllData();
    await expect(storage.getStoredPresets()).resolves.toHaveLength(0);

    await expect(backup.restoreBackup(text)).resolves.toEqual({
      presets: 1,
      sessions: 1,
      chems: 1,
      settingsRestored: true,
    });

    await expect(storage.getStoredSettings()).resolves.toMatchObject({ defaultStopBath: 45 });
    await expect(storage.getStoredPresets()).resolves.toHaveLength(1);
    await expect(storage.getStoredChems()).resolves.toMatchObject([{ name: 'ID-11', rollCount: 2 }]);
    await expect(storage.getStoredSessions()).resolves.toMatchObject([
      { id: 'session-1', outcome: 'dense', logNotes: 'Cut 10% next time.' },
    ]);
  });

  it('merges into existing data instead of replacing it', async () => {
    const { storage, backup } = await loadModules();

    await storage.saveStoredPreset(recipe);
    const text = JSON.stringify(await backup.createBackup());
    await storage.saveStoredPreset({ ...recipe, film: 'Tri-X 400' });

    await backup.restoreBackup(text);

    const films = (await storage.getStoredPresets()).map((preset) => preset.film).sort();
    expect(films).toEqual(['HP5 Plus', 'Tri-X 400']);
  });

  it('keeps this device API key storage mode when restoring settings', async () => {
    const { storage, backup } = await loadModules();

    await storage.saveStoredSettings({ ...DEFAULT_SETTINGS, apiKeyPersistenceMode: 'encrypted' });
    const text = JSON.stringify(await backup.createBackup());
    await storage.saveStoredSettings({ ...DEFAULT_SETTINGS, apiKeyPersistenceMode: 'session' });

    await backup.restoreBackup(text);

    await expect(storage.getStoredSettings()).resolves.toMatchObject({
      apiKeyPersistenceMode: 'session',
    });
  });

  it('rejects files that are not DarkTimer backups', async () => {
    const { backup } = await loadModules();

    expect(() => backup.parseBackup('not json')).toThrow(/not valid json/i);
    expect(() => backup.parseBackup('{"presets":[]}')).toThrow(/not a darktimer backup/i);
    expect(() =>
      backup.parseBackup(JSON.stringify({ app: 'darktimer', formatVersion: 99 })),
    ).toThrow(/newer version/i);
    expect(() =>
      backup.parseBackup(JSON.stringify({ app: 'darktimer', formatVersion: 1, presets: {} })),
    ).toThrow(/damaged/i);
  });

  it('names backup files by local date', async () => {
    const { backup } = await loadModules();

    expect(backup.getBackupFileName(new Date(2026, 9, 3).getTime())).toBe(
      'darktimer-backup-2026-10-03.json',
    );
  });
});
