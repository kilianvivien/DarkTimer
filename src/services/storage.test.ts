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

  it('updates an existing preset in IndexedDB without changing its creation date', async () => {
    const storage = await loadStorage();
    const nowSpy = vi.spyOn(Date, 'now');

    nowSpy.mockReturnValue(100);
    const preset = await storage.saveStoredPreset({
      film: 'HP5',
      developer: 'ID-11',
      dilution: '1+1',
      iso: 400,
      tempC: 20,
      processMode: 'bw',
      phases: [],
      notes: '',
    });

    nowSpy.mockReturnValue(200);
    const updated = await storage.updateStoredPreset(preset.id, {
      film: 'HP5 Plus',
      developer: 'DD-X',
      dilution: '1+4',
      iso: 400,
      tempC: 20,
      processMode: 'bw',
      phases: [],
      notes: 'updated',
    });

    expect(updated).toMatchObject({
      id: preset.id,
      createdAt: 100,
      film: 'HP5 Plus',
      developer: 'DD-X',
      dilution: '1+4',
    });

    await expect(storage.getStoredPresets()).resolves.toMatchObject([
      { id: preset.id, film: 'HP5 Plus', developer: 'DD-X', createdAt: 100 },
    ]);
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

  it('persists, sorts, and clears session history entries', async () => {
    const storage = await loadStorage();

    await storage.saveStoredSession({
      id: 'older',
      recipe: {
        film: 'HP5',
        developer: 'ID-11',
        dilution: '1+1',
        iso: 400,
        tempC: 20,
        processMode: 'bw',
        phases: [],
        notes: '',
      },
      startTime: 100,
      endTime: 200,
      status: 'partial',
      phasesCompleted: 0,
    });

    await storage.saveStoredSession({
      id: 'newer',
      recipe: {
        film: 'Tri-X',
        developer: 'HC-110',
        dilution: 'B',
        iso: 400,
        tempC: 20,
        processMode: 'bw',
        phases: [],
        notes: '',
      },
      startTime: 300,
      endTime: 360,
      status: 'completed',
      phasesCompleted: 2,
    });

    await expect(storage.getStoredSessions()).resolves.toMatchObject([
      { id: 'newer', recipe: { film: 'Tri-X' } },
      { id: 'older', recipe: { film: 'HP5' } },
    ]);

    await storage.clearStoredSessions();
    await expect(storage.getStoredSessions()).resolves.toEqual([]);
  });

  it('notifies session subscribers on save and clear', async () => {
    const storage = await loadStorage();
    const listener = vi.fn();
    const unsubscribe = storage.subscribeToStorage('sessions', listener);

    await storage.saveStoredSession({
      id: 'session-1',
      recipe: {
        film: 'HP5',
        developer: 'ID-11',
        dilution: '1+1',
        iso: 400,
        tempC: 20,
        processMode: 'bw',
        phases: [],
        notes: '',
      },
      startTime: 100,
      endTime: 160,
      status: 'completed',
      phasesCompleted: 1,
    });
    await storage.clearStoredSessions();

    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('persists and clears an active timer session snapshot', async () => {
    const storage = await loadStorage();

    await storage.saveStoredActiveTimerSession({
      recipe: {
        film: 'HP5',
        developer: 'ID-11',
        dilution: '1+1',
        iso: 400,
        tempC: 20,
        processMode: 'bw',
        phases: [],
        notes: '',
      },
      timerPhases: [{ name: 'Developer', duration: 300, agitationMode: 'stand' }],
      compensationAddedSeconds: 0,
      currentPhaseIndex: 0,
      timeLeft: 240,
      isActive: true,
      countdownRemaining: null,
      countdownEndsAt: null,
      phaseStartedAt: 100,
      startedAt: 100,
      agitationOverride: null,
      updatedAt: 120,
    });

    await expect(storage.getStoredActiveTimerSession()).resolves.toMatchObject({
      recipe: { film: 'HP5' },
      currentPhaseIndex: 0,
      timeLeft: 240,
      isActive: true,
    });

    await storage.clearStoredActiveTimerSession();
    await expect(storage.getStoredActiveTimerSession()).resolves.toBeNull();
  });

  it('caches AI recipe lookups for offline fallback', async () => {
    const storage = await loadStorage();

    await storage.saveCachedAiRecipe('cache-key', {
      confidence: 'high',
      options: [
        {
          film: 'Tri-X',
          developer: 'HC-110',
          dilution: 'B',
          iso: 400,
          tempC: 20,
          processMode: 'bw',
          phases: [{ name: 'Developer', duration: 390, agitationMode: 'every-60s' }],
          notes: 'cached',
        },
      ],
    });

    await expect(storage.getCachedAiRecipe('cache-key')).resolves.toMatchObject({
      confidence: 'high',
      options: [{ film: 'Tri-X', developer: 'HC-110' }],
    });
  });
});
