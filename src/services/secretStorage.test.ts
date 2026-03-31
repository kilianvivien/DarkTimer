import { describe, expect, it, vi } from 'vitest';

async function loadSecretStorage() {
  vi.resetModules();
  return import('./secretStorage');
}

describe('secretStorage service', () => {
  it('migrates legacy plaintext keys into session state and clears old storage', async () => {
    localStorage.setItem('darktimer_gemini_key', 'legacy-gemini');

    const secretStorage = await loadSecretStorage();
    await secretStorage.initApiKeySession();

    expect(secretStorage.getApiKeyStateSnapshot()).toMatchObject({
      apiKeys: { gemini: 'legacy-gemini', mistral: '' },
      hasEncryptedApiKeys: false,
      isLocked: false,
      isReady: true,
    });
    expect(localStorage.getItem('darktimer_gemini_key')).toBeNull();
  });

  it('saves, clears, unlocks, and removes encrypted API keys', async () => {
    const secretStorage = await loadSecretStorage();

    await secretStorage.saveEncryptedApiKeys('darkroom', {
      gemini: ' gem-key ',
      mistral: 'mis-key',
    });

    expect(secretStorage.getApiKeyStateSnapshot()).toMatchObject({
      apiKeys: { gemini: 'gem-key', mistral: 'mis-key' },
      hasEncryptedApiKeys: true,
      isLocked: false,
    });

    await secretStorage.clearSessionApiKeys();
    expect(secretStorage.getApiKeyStateSnapshot()).toMatchObject({
      apiKeys: { gemini: '', mistral: '' },
      hasEncryptedApiKeys: true,
      isLocked: true,
    });

    await expect(secretStorage.unlockEncryptedApiKeys('darkroom')).resolves.toEqual({
      gemini: 'gem-key',
      mistral: 'mis-key',
    });

    await secretStorage.clearEncryptedApiKeys();
    expect(secretStorage.getApiKeyStateSnapshot()).toMatchObject({
      apiKeys: { gemini: '', mistral: '' },
      hasEncryptedApiKeys: false,
      isLocked: false,
    });
  });

  it('rejects an incorrect passphrase', async () => {
    const secretStorage = await loadSecretStorage();

    await secretStorage.saveEncryptedApiKeys('correct', {
      gemini: 'gem-key',
      mistral: '',
    });
    await secretStorage.clearSessionApiKeys();

    await expect(secretStorage.unlockEncryptedApiKeys('wrong')).rejects.toThrow(
      'Passphrase is incorrect or the saved secure keys could not be unlocked.',
    );
  });
});
