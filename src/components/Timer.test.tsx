import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timer } from './Timer';
import { DEFAULT_SETTINGS } from '../services/userSettings';

const showNotificationMock = vi.fn();

vi.mock('../services/notifications', () => ({
  showNotification: (...args: unknown[]) => showNotificationMock(...args),
}));

const phases = [
  { name: 'Developer', duration: 2, agitationMode: 'every-60s' as const, agitation: 'Agitate every 1 minute.' },
  { name: 'Fixer', duration: 1, agitationMode: 'stand' as const, agitation: 'Stand with no agitation cues.' },
];

function getCurrentTimerDisplay(): HTMLElement {
  return screen.getByText((_content, element) => element?.getAttribute('aria-live') === 'polite');
}

describe('Timer', () => {
  beforeEach(() => {
    showNotificationMock.mockReset();
    vi.useFakeTimers();
  });

  it('enters and cancels the pre-start countdown state', async () => {
    render(
      <Timer
        phases={phases}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 5 }}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    expect(screen.getByText('Starting in')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /cancel/i })[0]);
    expect(screen.queryByText('Starting in')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /start/i })).not.toHaveLength(0);
  });

  it('supports pause, reset, skip, and completion callbacks', async () => {
    const onComplete = vi.fn();

    render(
      <Timer
        phases={phases}
        onComplete={onComplete}
        onExitSession={vi.fn()}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0, notificationsEnabled: true }}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(getCurrentTimerDisplay()).toHaveTextContent('0:01');

    fireEvent.click(screen.getAllByRole('button', { name: /pause/i })[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(getCurrentTimerDisplay()).toHaveTextContent('0:01');

    fireEvent.click(screen.getAllByRole('button')[2]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(getCurrentTimerDisplay()).toHaveTextContent('0:02');

    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    fireEvent.click(screen.getAllByRole('button')[4]);
    expect(screen.getByText('Phase 2/2')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(showNotificationMock).toHaveBeenCalledWith('Development complete', 'All phases finished.');
  });

  it('falls back to immersive mode on narrow PWAs when native fullscreen is unavailable', async () => {
    const originalRequestFullscreen = HTMLElement.prototype.requestFullscreen;
    const originalMatchMedia = window.matchMedia;
    const originalInnerWidth = window.innerWidth;

    try {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 390,
      });

      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
        configurable: true,
        writable: true,
        value: vi.fn(async () => {
          throw new Error('fullscreen unsupported');
        }),
      });

      render(
        <Timer
          phases={phases}
          onComplete={vi.fn()}
          onExitSession={vi.fn()}
          settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0 }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
        await Promise.resolve();
      });

      expect(screen.getByRole('button', { name: /leave fullscreen/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /leave fullscreen/i }));
      expect(screen.queryByRole('button', { name: /leave fullscreen/i })).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: originalInnerWidth,
      });
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
        configurable: true,
        writable: true,
        value: originalRequestFullscreen,
      });
    }
  });

  it('suppresses audio side effects while muted', async () => {
    const oscillatorStart = vi.fn();

    class TestAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => {});
      createOscillator() {
        return {
          type: 'square',
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: oscillatorStart,
          stop: vi.fn(),
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: TestAudioContext,
    });

    render(
      <Timer
        phases={[{ name: 'Developer', duration: 1, agitationMode: 'stand' as const }]}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0 }}
      />,
    );

    fireEvent.click(screen.getAllByRole('button')[1]);
    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(oscillatorStart).not.toHaveBeenCalled();
  });
});
