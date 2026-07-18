import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_SETTINGS } from './services/userSettings';
import type { PwaUpdateState } from './services/pwa';
import { setOnlineStatus } from './test/utils';

const pwaMocks = vi.hoisted(() => ({
  applyPwaUpdate: vi.fn(async () => {}),
  dismissPwaUpdatePrompt: vi.fn(),
  dismissPwaOfflineReady: vi.fn(),
  dismissPwaInstallPrompt: vi.fn(),
  requestPwaInstall: vi.fn(async () => 'accepted' as const),
  getInstallInstructions: vi.fn(() => ({
    title: 'Install on iPhone or iPad',
    body: 'Open Share, then Add to Home Screen.',
  })),
  pwaSnapshot: {
    needRefresh: false,
    offlineReady: false,
    isUpdating: false,
    isOnline: true,
    isStandalone: false,
    isInstallPromptAvailable: false,
    isInstallDismissed: true,
    installPlatform: 'unsupported',
  } as PwaUpdateState,
}));

const storedSessionsMock = vi.hoisted(() => ({
  sessions: [] as unknown[],
}));

vi.mock('./hooks/useStoredData', () => ({
  useStorageReady: () => true,
  useStoredSettings: () => ({ data: DEFAULT_SETTINGS, isLoading: false, refresh: vi.fn() }),
  useStoredPresets: () => ({ data: [], isLoading: false, refresh: vi.fn() }),
  useStoredSessions: () => ({ data: storedSessionsMock.sessions, isLoading: false, refresh: vi.fn() }),
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
  dismissPwaOfflineReady: pwaMocks.dismissPwaOfflineReady,
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
      offlineReady: false,
      isUpdating: false,
      isOnline: true,
      isStandalone: false,
      isInstallPromptAvailable: false,
      isInstallDismissed: true,
      installPlatform: 'unsupported',
    };
    storedSessionsMock.sessions = [];
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

  it('uses a compact glass navigation pill on tablets', () => {
    render(<App />);

    const navigation = screen.getByRole('navigation', { name: 'Primary' });
    expect(navigation).toHaveClass('rounded-[1.75rem]');
    expect(navigation).toHaveClass('backdrop-blur-2xl');
    expect(navigation).not.toHaveClass('inset-y-0');
    expect(navigation).not.toHaveClass('border-r');
  });

  it('renders the DarkTimer wordmark without a camera icon', () => {
    render(<App />);

    const wordmarks = screen.getAllByRole('button', { name: 'Return to manual timer' });
    expect(wordmarks.length).toBeGreaterThan(0);
    wordmarks.forEach((wordmark) => {
      expect(wordmark).toHaveTextContent('DARKTIMER');
      expect(wordmark.querySelector('svg')).toBeNull();
    });
  });

  it('moves header actions into the rail on landscape tablets', () => {
    render(<App />);

    const navigation = screen.getByRole('navigation', { name: 'Primary' });
    expect(navigation).toHaveClass('tablet-landscape-nav');
    expect(navigation.querySelector('.tablet-landscape-rail-brand')).toBeInTheDocument();
    expect(navigation.querySelector('.tablet-landscape-main-rail')).toBeInTheDocument();
    expect(navigation.querySelector('.tablet-landscape-rail-actions')).toBeInTheDocument();
  });

  it('shows an iPhone portrait safety tip when safelight mode is enabled', async () => {
    const originalUserAgent = navigator.userAgent;
    const originalMatchMedia = window.matchMedia;

    try {
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)',
      });
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(orientation: portrait)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getAllByRole('button', { name: 'Switch to safelight theme' })[0]);

      expect(await screen.findByText('iPhone safelight tip')).toBeInTheDocument();
      expect(screen.getByText(/rotate to landscape so iOS hides its bright status bar/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Dismiss iPhone safelight tip' }));
      await waitFor(() => {
        expect(screen.queryByText('iPhone safelight tip')).not.toBeInTheDocument();
      });
    } finally {
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value: originalUserAgent,
      });
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('explains the complete workflow in the help guide', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: 'How to use' })[0]);

    expect(screen.getByText('Run the Timer')).toBeInTheDocument();
    expect(screen.getByText(/offline chart and cache first/i)).toBeInTheDocument();
    expect(screen.getByText(/recipes, chemistry, and session history stay on this device/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /how to use darktimer/i }).closest('.help-modal-panel')).toHaveClass('help-modal-panel');
    expect(screen.getByRole('button', { name: 'Close help' }).parentElement).toHaveClass('sticky');

    await user.click(screen.getByRole('button', { name: 'Close help' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /how to use darktimer/i })).not.toBeInTheDocument();
    });
  });

  it('does not render the old desktop licence footer', () => {
    render(<App />);

    expect(screen.queryByText(/darktimer — mit licence/i)).not.toBeInTheDocument();
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
    storedSessionsMock.sessions = [{ id: 'session-1' }];
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
