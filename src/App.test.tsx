import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_SETTINGS } from './services/userSettings';

vi.mock('./hooks/useStoredData', () => ({
  useStorageReady: () => true,
  useStoredSettings: () => ({ data: DEFAULT_SETTINGS, isLoading: false, refresh: vi.fn() }),
  useStoredPresets: () => ({ data: [], isLoading: false, refresh: vi.fn() }),
  useStoredSessions: () => ({ data: [], isLoading: false, refresh: vi.fn() }),
}));

vi.mock('./hooks/useApiKeySession', () => ({
  useApiKeySession: () => ({
    apiKeys: { gemini: '', mistral: '' },
    hasEncryptedApiKeys: false,
    isLocked: false,
    isReady: true,
    migrationNotice: '',
  }),
}));

describe('App', () => {
  it('exposes History in the main navigation', async () => {
    render(<App />);

    expect(screen.getAllByText('History').length).toBeGreaterThan(0);
  });
});
