import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_SETTINGS } from './services/userSettings';
import type { PwaUpdateState } from './services/pwa';

const pwaMocks = vi.hoisted(() => ({
  applyPwaUpdate: vi.fn(async () => {}),
  dismissPwaUpdatePrompt: vi.fn(),
  pwaSnapshot: { needRefresh: false, isUpdating: false } as PwaUpdateState,
}));

vi.mock('./hooks/useStoredData', () => ({
  useStorageReady: () => true,
  useStoredSettings: () => ({ data: DEFAULT_SETTINGS, isLoading: false, refresh: vi.fn() }),
  useStoredPresets: () => ({ data: [], isLoading: false, refresh: vi.fn() }),
  useStoredSessions: () => ({ data: [], isLoading: false, refresh: vi.fn() }),
  useStoredChems: () => ({ data: [], isLoading: false, refresh: vi.fn() }),
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

vi.mock('./services/pwa', () => ({
  applyPwaUpdate: pwaMocks.applyPwaUpdate,
  dismissPwaUpdatePrompt: pwaMocks.dismissPwaUpdatePrompt,
  getPwaUpdateSnapshot: () => pwaMocks.pwaSnapshot,
  subscribeToPwaUpdates: () => () => {},
}));

describe('App', () => {
  beforeEach(() => {
    pwaMocks.pwaSnapshot = { needRefresh: false, isUpdating: false };
    pwaMocks.applyPwaUpdate.mockClear();
    pwaMocks.dismissPwaUpdatePrompt.mockClear();
  });

  it('exposes Library in the main navigation', async () => {
    render(<App />);

    expect(screen.getAllByText('Library').length).toBeGreaterThan(0);
  });

  it('offers an in-app update action when a new PWA version is ready', async () => {
    pwaMocks.pwaSnapshot = { needRefresh: true, isUpdating: false };

    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText('Update Ready')).toBeInTheDocument();
    expect(screen.getByText(/your recipes, history, chemistry, and settings stay on this device/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update App' }));

    expect(pwaMocks.applyPwaUpdate).toHaveBeenCalledTimes(1);
  });
});
