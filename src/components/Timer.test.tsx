import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timer } from './Timer';
import { DEFAULT_SETTINGS } from '../services/userSettings';
import { clearStoredActiveTimerSession, getStoredActiveTimerSession } from '../services/storage';
import { flushPromises } from '../test/utils';

const showNotificationMock = vi.fn();
const storageMocks = vi.hoisted(() => {
  let activeTimerSession: unknown = null;

  return {
    saveStoredActiveTimerSession: vi.fn(async (session: unknown) => {
      activeTimerSession = session;
      return session;
    }),
    clearStoredActiveTimerSession: vi.fn(async () => {
      activeTimerSession = null;
    }),
    getStoredActiveTimerSession: vi.fn(async () => activeTimerSession),
    reset: () => {
      activeTimerSession = null;
    },
  };
});

vi.mock('../services/notifications', () => ({
  showNotification: (...args: unknown[]) => showNotificationMock(...args),
}));

vi.mock('../services/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/storage')>();

  return {
    ...actual,
    saveStoredActiveTimerSession: storageMocks.saveStoredActiveTimerSession,
    clearStoredActiveTimerSession: storageMocks.clearStoredActiveTimerSession,
    getStoredActiveTimerSession: storageMocks.getStoredActiveTimerSession,
  };
});

const phases = [
  { name: 'Developer', duration: 2, agitationMode: 'every-60s' as const, agitation: 'Agitate every 1 minute.' },
  { name: 'Fixer', duration: 1, agitationMode: 'stand' as const, agitation: 'Stand with no agitation cues.' },
];
const recipe = {
  film: 'HP5',
  developer: 'ID-11',
  dilution: '1+1',
  iso: 400,
  tempC: 20,
  processMode: 'bw' as const,
  phases,
  notes: '',
};

function getCurrentTimerDisplay(): HTMLElement {
  return screen.getByText((_content, element) => element?.getAttribute('aria-live') === 'polite');
}

describe('Timer', () => {
  beforeEach(() => {
    showNotificationMock.mockReset();
    storageMocks.reset();
    storageMocks.saveStoredActiveTimerSession.mockClear();
    storageMocks.clearStoredActiveTimerSession.mockClear();
    storageMocks.getStoredActiveTimerSession.mockClear();
    vi.useFakeTimers();
  });

  it('enters and cancels the pre-start countdown state', async () => {
    render(
      <Timer
        recipeSnapshot={recipe}
        phases={phases}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        onSessionEnd={vi.fn()}
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
    const onSessionEnd = vi.fn();

    render(
      <Timer
        recipeSnapshot={recipe}
        phases={phases}
        onComplete={onComplete}
        onExitSession={vi.fn()}
        onSessionEnd={onSessionEnd}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0, notificationsEnabled: true }}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1250);
    });
    expect(getCurrentTimerDisplay()).toHaveTextContent('0:01');

    fireEvent.click(screen.getAllByRole('button', { name: /pause/i })[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(getCurrentTimerDisplay()).toHaveTextContent('0:01');

    fireEvent.click(screen.getByRole('button', { name: /reset current phase/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(getCurrentTimerDisplay()).toHaveTextContent('0:02');

    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /skip current phase/i }));
    expect(screen.getByText('Phase 2/2')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1250);
      await flushPromises();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onSessionEnd).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', phasesCompleted: 2 }),
    );
    await expect(getStoredActiveTimerSession()).resolves.toBeNull();
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
          recipeSnapshot={recipe}
          phases={phases}
          onComplete={vi.fn()}
          onExitSession={vi.fn()}
          onSessionEnd={vi.fn()}
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

  it('enters fullscreen from the dedicated fullscreen button, including after compensation changes', async () => {
    const { rerender } = render(
      <Timer
        recipeSnapshot={recipe}
        phases={phases}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        onSessionEnd={vi.fn()}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0 }}
      />,
    );

    rerender(
      <Timer
        recipeSnapshot={recipe}
        phases={[{ ...phases[0], duration: 3 }, phases[1]]}
        compensationAddedSeconds={1}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        onSessionEnd={vi.fn()}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0 }}
      />,
    );

    await act(async () => {
      fireEvent.pointerDown(screen.getByRole('button', { name: /enter fullscreen/i }));
      fireEvent.click(screen.getByRole('button', { name: /enter fullscreen/i }));
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: /leave fullscreen/i })).toBeInTheDocument();
  });

  it('treats a compensation-adjusted phase as a fresh start', async () => {
    const requestFullscreenSpy = vi.spyOn(HTMLElement.prototype, 'requestFullscreen');
    const { rerender } = render(
      <Timer
        recipeSnapshot={recipe}
        phases={phases}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        onSessionEnd={vi.fn()}
        settings={DEFAULT_SETTINGS}
      />,
    );

    rerender(
      <Timer
        recipeSnapshot={recipe}
        phases={[{ ...phases[0], duration: 3 }, phases[1]]}
        compensationAddedSeconds={1}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        onSessionEnd={vi.fn()}
        settings={DEFAULT_SETTINGS}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
      await Promise.resolve();
    });

    expect(screen.getByText('Starting in')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave fullscreen/i })).toBeInTheDocument();
    expect(requestFullscreenSpy).toHaveBeenCalled();

    requestFullscreenSpy.mockRestore();
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
        recipeSnapshot={recipe}
        phases={[{ name: 'Developer', duration: 1, agitationMode: 'stand' as const }]}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        onSessionEnd={vi.fn()}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0 }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /mute timer sounds/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(oscillatorStart).not.toHaveBeenCalled();
  });

  it('reports an aborted session when exiting before any timer progress', async () => {
    const onSessionEnd = vi.fn();
    const onExitSession = vi.fn();

    render(
      <Timer
        recipeSnapshot={recipe}
        phases={[{ name: 'Developer', duration: 3, agitationMode: 'stand' as const }]}
        onComplete={vi.fn()}
        onExitSession={onExitSession}
        onSessionEnd={onSessionEnd}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0 }}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /exit session/i }));
    });

    expect(onSessionEnd).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'aborted', phasesCompleted: 0 }),
    );
    expect(onExitSession).toHaveBeenCalledTimes(1);
  });

  it('reports a partial session when exiting after progress', async () => {
    const onSessionEnd = vi.fn();

    render(
      <Timer
        recipeSnapshot={recipe}
        phases={[{ name: 'Developer', duration: 3, agitationMode: 'stand' as const }]}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        onSessionEnd={onSessionEnd}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0 }}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /exit session/i }));
    });

    expect(onSessionEnd).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'partial', phasesCompleted: 0 }),
    );
  });

  it('persists the active timer session and clears it when exiting', async () => {
    render(
      <Timer
        recipeSnapshot={recipe}
        phases={phases}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        onSessionEnd={vi.fn()}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0 }}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /start/i })[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await expect(getStoredActiveTimerSession()).resolves.toMatchObject({
      recipe: { film: 'HP5' },
      currentPhaseIndex: 0,
      isActive: true,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /exit session/i }));
    });

    await expect(getStoredActiveTimerSession()).resolves.toBeNull();
  });

  it('rehydrates an in-progress timer session from stored state', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(10_000);

    await clearStoredActiveTimerSession();

    render(
      <Timer
        recipeSnapshot={recipe}
        phases={phases}
        initialSession={{
          recipe,
          timerPhases: phases,
          compensationAddedSeconds: 0,
          currentPhaseIndex: 0,
          timeLeft: 2,
          isActive: true,
          countdownRemaining: null,
          countdownEndsAt: null,
          phaseStartedAt: 9_000,
          startedAt: 9_000,
          agitationOverride: null,
          updatedAt: 10_000,
        }}
        onComplete={vi.fn()}
        onExitSession={vi.fn()}
        onSessionEnd={vi.fn()}
        settings={{ ...DEFAULT_SETTINGS, phaseCountdown: 0 }}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(getCurrentTimerDisplay()).toHaveTextContent('0:01');
  });
});
