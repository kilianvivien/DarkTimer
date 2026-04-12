import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_SETTINGS } from './services/userSettings';
import type { PwaUpdateState } from './services/pwa';
import { setOnlineStatus } from './test/utils';

const pwaMocks = vi.hoisted(() => ({
  applyPwaUpdate: vi.fn(async () => {}),
  dismissPwaUpdatePrompt: vi.fn(),
  dismissPwaInstallPrompt: vi.fn(),
  requestPwaInstall: vi.fn(async () => 'accepted' as const),
  getInstallInstructions: vi.fn(() => ({
    title: 'Install on iPhone or iPad',
    body: 'Open Share, then Add to Home Screen.',
  })),
  pwaSnapshot: {
    needRefresh: false,
    isUpdating: false,
    isOnline: true,
    isStandalone: false,
    isInstallPromptAvailable: false,
    isInstallDismissed: true,
    installPlatform: 'unsupported',
  } as PwaUpdateState,
}));

vi.mock('./hooks/useStoredData', () => ({
  useStorageReady: () => true,
  useStoredSettings: () => ({ data: DEFAULT_SETTINGS, isLoading: false, refresh: vi.fn() }),
  useStoredPresets: () => ({ data: [], isLoading: false, refresh: vi.fn() }),
  useStoredSessions: () => ({ data: [], isLoading: false, refresh: vi.fn() }),
  useStoredChems: () => ({ data: [], isLoading: false, refresh: vi.fn() }),
  useStoredActiveTimerSession: () => ({ data: null, isLoading: false, refresh: vi.fn() }),
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
  dismissPwaInstallPrompt: pwaMocks.dismissPwaInstallPrompt,
  dismissPwaUpdatePrompt: pwaMocks.dismissPwaUpdatePrompt,
  getPwaUpdateSnapshot: () => pwaMocks.pwaSnapshot,
  getInstallInstructions: pwaMocks.getInstallInstructions,
  requestPwaInstall: pwaMocks.requestPwaInstall,
  subscribeToPwaUpdates: () => () => {},
  __resetPwaStateForTests: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    pwaMocks.pwaSnapshot = {
      needRefresh: false,
      isUpdating: false,
      isOnline: true,
      isStandalone: false,
      isInstallPromptAvailable: false,
      isInstallDismissed: true,
      installPlatform: 'unsupported',
    };
    pwaMocks.applyPwaUpdate.mockClear();
    pwaMocks.dismissPwaInstallPrompt.mockClear();
    pwaMocks.dismissPwaUpdatePrompt.mockClear();
    pwaMocks.requestPwaInstall.mockClear();
    pwaMocks.getInstallInstructions.mockClear();
    setOnlineStatus(true);
  });

  it('exposes Library in the main navigation', async () => {
    render(<App />);

    expect(screen.getAllByText('Library').length).toBeGreaterThan(0);
  });

  it('offers an in-app update action when a new PWA version is ready', async () => {
    pwaMocks.pwaSnapshot = {
      ...pwaMocks.pwaSnapshot,
      needRefresh: true,
      isUpdating: false,
    };

    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText('Update Ready')).toBeInTheDocument();
    expect(screen.getByText(/your recipes, history, chemistry, and settings stay on this device/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update App' }));

    expect(pwaMocks.applyPwaUpdate).toHaveBeenCalledTimes(1);
  });

  it('shows an install banner with a native install action when available', async () => {
    pwaMocks.pwaSnapshot = {
      ...pwaMocks.pwaSnapshot,
      isInstallPromptAvailable: true,
      isInstallDismissed: false,
      installPlatform: 'desktop-chrome',
    };
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText('Install DarkTimer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Install App' }));

    expect(pwaMocks.requestPwaInstall).toHaveBeenCalledTimes(1);
  });

  it('shows app-level offline status outside the AI screen', () => {
    pwaMocks.pwaSnapshot = {
      ...pwaMocks.pwaSnapshot,
      isOnline: false,
    };

    render(<App />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText(/manual recipes, your saved presets, chemistry, and timers still work/i)).toBeInTheDocument();
  });
});
