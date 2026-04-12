import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, SkipForward, Bell, BellOff, Minimize, Maximize, X, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { formatTime, cn } from '../lib/utils';
import {
  type ActiveTimerSession,
  AgitationMode,
  DevPhase,
  getAgitationDescription,
  getAgitationLabel,
  getAgitationInterval,
  type SessionStatus,
} from '../services/recipe';
import { showNotification } from '../services/notifications';
import { clearStoredActiveTimerSession, saveStoredActiveTimerSession } from '../services/storage';
import type { UserSettings } from '../services/userSettings';

type TauriWindowHandle = {
  isFullscreen: () => Promise<boolean>;
  setFullscreen: (fullscreen: boolean) => Promise<void>;
};

let tauriWindowHandlePromise: Promise<TauriWindowHandle | null> | null = null;

const isTauriRuntime = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const tauriWindow = window as Window & {
    __TAURI_INTERNALS__?: unknown;
    isTauri?: boolean;
  };

  return Boolean(tauriWindow.__TAURI_INTERNALS__ || tauriWindow.isTauri);
};

const getTauriWindowHandle = async (): Promise<TauriWindowHandle | null> => {
  if (!isTauriRuntime()) {
    return null;
  }

  if (!tauriWindowHandlePromise) {
    tauriWindowHandlePromise = import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) => getCurrentWindow())
      .catch((error) => {
        console.error('Failed to load Tauri window API:', error);
        tauriWindowHandlePromise = null;
        return null;
      });
  }

  return tauriWindowHandlePromise;
};

export interface TimerSessionResult {
  startTime: number;
  endTime: number;
  status: SessionStatus;
  phasesCompleted: number;
}

interface TimerProps {
  recipeSnapshot: ActiveTimerSession['recipe'];
  phases: DevPhase[];
  compensationAddedSeconds?: number;
  initialSession?: ActiveTimerSession | null;
  onComplete: () => void;
  onExitSession: () => void;
  onSessionEnd: (result: TimerSessionResult) => Promise<void> | void;
  settings: UserSettings;
}

export const Timer: React.FC<TimerProps> = ({
  recipeSnapshot,
  phases,
  compensationAddedSeconds = 0,
  initialSession = null,
  onComplete,
  onExitSession,
  onSessionEnd,
  settings,
}) => {
  const notificationsEnabled = settings.notificationsEnabled;
  const countdownFrom = settings.phaseCountdown;
  const initialPhaseIndex = initialSession?.currentPhaseIndex ?? 0;
  const initialPhase = phases[initialPhaseIndex] ?? phases[0];
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(initialPhaseIndex);
  const [timeLeft, setTimeLeft] = useState(initialSession?.timeLeft ?? initialPhase?.duration ?? 0);
  const [isActive, setIsActive] = useState(initialSession?.isActive ?? false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgitating, setIsAgitating] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(initialSession?.countdownRemaining ?? null);
  const [flashVisible, setFlashVisible] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersiveFallback, setIsImmersiveFallback] = useState(false);
  const [agitationOverride, setAgitationOverride] = useState<AgitationMode | null>(
    initialSession?.agitationOverride ?? null,
  );
  const isMutedRef = useRef(isMuted);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ownsFullscreenRef = useRef(false);
  const reduceMotion = useReducedMotion();

  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAgitationCueRef = useRef<string | null>(null);
  const phaseStartedAtRef = useRef<number | null>(initialSession?.phaseStartedAt ?? null);
  const countdownEndsAtRef = useRef<number | null>(initialSession?.countdownEndsAt ?? null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastPersistedSignatureRef = useRef('');
  const sessionClosedRef = useRef(false);
  const sessionStartTimeRef = useRef<number | null>(initialSession?.startedAt ?? null);
  const hasProgressRef = useRef(false);
  const phasesCompletedRef = useRef(initialSession?.currentPhaseIndex ?? 0);
  const sessionReportedRef = useRef(false);
  const fullscreenRequestInFlightRef = useRef(false);

  const AGITATION_ALERT_SECONDS = 5;
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  const isImmersiveMode = isFullscreen || isImmersiveFallback;

  const canUseImmersiveFallback = () => {
    if (typeof window === 'undefined') {
      return false;
    }

    const navigatorWithStandalone =
      typeof navigator === 'undefined'
        ? undefined
        : (navigator as Navigator & { standalone?: boolean });
    const isStandaloneDisplay =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      navigatorWithStandalone?.standalone === true;

    return window.innerWidth < 768 || isStandaloneDisplay;
  };

  const getAudioContext = () => {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }

    return audioContextRef.current;
  };

  const primeAudio = () => {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'suspended') {
      return;
    }

    void ctx.resume().catch((error) => {
      console.error('Failed to resume audio context:', error);
    });
  };

  const triggerFlash = () => {
    if (!settings.agitationFlashEnabled) {
      return;
    }

    setFlashVisible(false);
    setFlashKey((current) => current + 1);
    setFlashVisible(true);
  };

  const exitFullscreen = async () => {
    setIsImmersiveFallback(false);

    if (!ownsFullscreenRef.current) {
      ownsFullscreenRef.current = false;
      return;
    }

    try {
      if (typeof document !== 'undefined' && document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
        return;
      }

      const tauriWindow = await getTauriWindowHandle();
      if (tauriWindow && (await tauriWindow.isFullscreen())) {
        await tauriWindow.setFullscreen(false);
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    } finally {
      ownsFullscreenRef.current = false;
    }
  };

  const requestFullscreen = async () => {
    if (typeof document === 'undefined' || document.fullscreenElement) {
      return;
    }

    if (!containerRef.current?.requestFullscreen) {
      if (canUseImmersiveFallback()) {
        setIsImmersiveFallback(true);
      }
      return;
    }

    try {
      await containerRef.current.requestFullscreen();
      ownsFullscreenRef.current = true;
      setIsImmersiveFallback(false);
    } catch (error) {
      const tauriWindow = await getTauriWindowHandle();
      if (tauriWindow) {
        try {
          await tauriWindow.setFullscreen(true);
          ownsFullscreenRef.current = true;
          setIsFullscreen(true);
          setIsImmersiveFallback(false);
          return;
        } catch (tauriError) {
          console.error('Failed to enter native fullscreen:', tauriError);
        }
      }

      if (canUseImmersiveFallback()) {
        setIsImmersiveFallback(true);
        return;
      }

      console.error('Failed to enter fullscreen:', error);
    }
  };

  const handleEnterFullscreen = async () => {
    if (fullscreenRequestInFlightRef.current) {
      return;
    }

    fullscreenRequestInFlightRef.current = true;

    try {
      await requestFullscreen();
    } finally {
      fullscreenRequestInFlightRef.current = false;
    }
  };

  const handleFullscreenButtonPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    void handleEnterFullscreen();
  };

  const handleFullscreenButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void handleEnterFullscreen();
  };

  const playBeep = (freq: number, duration: number) => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') {
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const triggerVibration = (pattern: number | number[]) => {
    if (!settings.agitationVibrationEnabled || !canVibrate) {
      return;
    }

    navigator.vibrate(pattern);
  };

  const startSession = () => {
    if (sessionStartTimeRef.current !== null) {
      return;
    }

    sessionClosedRef.current = false;
    sessionStartTimeRef.current = Date.now();
    hasProgressRef.current = false;
    phasesCompletedRef.current = 0;
    sessionReportedRef.current = false;
  };

  const syncTimeLeftFromNow = () => {
    const startedAt = phaseStartedAtRef.current;
    const current = phases[currentPhaseIndex];

    if (!isActive || !current || startedAt === null) {
      return;
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

    if (elapsedSeconds >= current.duration) {
      const nextPhaseIndex = currentPhaseIndex + 1;
      playBeep(880, 0.5);

      if (nextPhaseIndex < phases.length) {
        const nextPhase = phases[nextPhaseIndex];
        phasesCompletedRef.current = nextPhaseIndex;
        if (notificationsEnabled) {
          showNotification(`${current.name} complete`, `Next: ${nextPhase.name}`);
        }
        triggerVibration(120);
        phaseStartedAtRef.current = null;
        setCurrentPhaseIndex(nextPhaseIndex);
        setTimeLeft(nextPhase.duration);
        setIsActive(false);
        setCountdown(null);
        return;
      }

      phasesCompletedRef.current = phases.length;
      sessionClosedRef.current = true;
      if (notificationsEnabled) {
        showNotification('Development complete', 'All phases finished.');
      }
      triggerVibration([160, 120, 220]);
      phaseStartedAtRef.current = null;
      setIsActive(false);
      setCountdown(null);
      void (async () => {
        await clearStoredActiveTimerSession();
        await exitFullscreen();
        await reportSessionEnd('completed', phases.length);
        onComplete();
      })();
      return;
    }

    const nextTimeLeft = current.duration - elapsedSeconds;
    if (nextTimeLeft < current.duration) {
      hasProgressRef.current = true;
    }
    setTimeLeft(nextTimeLeft);
  };

  const reportSessionEnd = async (status: SessionStatus, phasesCompleted = phasesCompletedRef.current) => {
    if (sessionReportedRef.current || sessionStartTimeRef.current === null) {
      return;
    }

    sessionReportedRef.current = true;
    await onSessionEnd({
      startTime: sessionStartTimeRef.current,
      endTime: Date.now(),
      status,
      phasesCompleted,
    });
  };

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const resumePhaseIndex = initialSession?.currentPhaseIndex ?? 0;
    const resumePhase = phases[resumePhaseIndex] ?? phases[0];
    setCurrentPhaseIndex(resumePhaseIndex);
    setTimeLeft(initialSession?.timeLeft ?? resumePhase?.duration ?? 0);
    setIsActive(initialSession?.isActive ?? false);
    setCountdown(initialSession?.countdownRemaining ?? null);
    setIsAgitating(false);
    setFlashVisible(false);
    setIsImmersiveFallback(false);
    setAgitationOverride(initialSession?.agitationOverride ?? null);
    lastAgitationCueRef.current = null;
    phaseStartedAtRef.current = initialSession?.phaseStartedAt ?? null;
    countdownEndsAtRef.current = initialSession?.countdownEndsAt ?? null;
    sessionClosedRef.current = false;
    sessionStartTimeRef.current = initialSession?.startedAt ?? null;
    hasProgressRef.current = (initialSession?.currentPhaseIndex ?? 0) > 0;
    phasesCompletedRef.current = initialSession?.currentPhaseIndex ?? 0;
    sessionReportedRef.current = false;
  }, [initialSession, phases]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
      if (document.fullscreenElement === containerRef.current) {
        setIsImmersiveFallback(false);
      }
      if (document.fullscreenElement !== containerRef.current) {
        ownsFullscreenRef.current = false;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    handleFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      void exitFullscreen();
    };
  }, []);

  useEffect(() => {
    if (!phases[currentPhaseIndex]) {
      return;
    }

    if (!initialSession || currentPhaseIndex !== initialSession.currentPhaseIndex) {
      setTimeLeft(phases[currentPhaseIndex].duration);
      setAgitationOverride(null);
    }
    setIsAgitating(false);
    setFlashVisible(false);
    lastAgitationCueRef.current = null;
  }, [currentPhaseIndex, initialSession, phases]);

  useEffect(() => {
    let interval: number | undefined;

    if (isActive) {
      syncTimeLeftFromNow();
      interval = window.setInterval(() => {
        syncTimeLeftFromNow();
      }, 250);
    }

    return () => clearInterval(interval);
  }, [currentPhaseIndex, isActive, notificationsEnabled, onComplete, phases]);

  // Agitation Logic
  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      setIsAgitating(false);
      return;
    }

    const currentPhase = phases[currentPhaseIndex];
    const effectiveMode = agitationOverride ?? currentPhase.agitationMode;
    const agitationInterval = getAgitationInterval(effectiveMode);

    if (!agitationInterval) {
      setIsAgitating(false);
      return;
    }

    const elapsed = currentPhase.duration - timeLeft;
    const cycleTime = elapsed % agitationInterval;
    const agitating = elapsed > 0 && cycleTime < AGITATION_ALERT_SECONDS;
    const agitationDetails = getAgitationDescription(effectiveMode);

    if (elapsed > 0 && cycleTime === 0) {
      const cueKey = `${currentPhaseIndex}:${Math.floor(elapsed / agitationInterval)}`;

      if (lastAgitationCueRef.current !== cueKey) {
        lastAgitationCueRef.current = cueKey;
        triggerFlash();
        playBeep(440, 0.2); // Agitation start beep
        triggerVibration([200, 100, 200]);
        if (notificationsEnabled) {
          showNotification('Agitate now', agitationDetails || undefined);
        }
      }
    }

    setIsAgitating(agitating);

  }, [agitationOverride, currentPhaseIndex, isActive, notificationsEnabled, phases, timeLeft]);

  // Pre-start countdown
  useEffect(() => {
    if (countdown === null) return;

    const playTick = (freq: number, dur: number) => {
      if (isMutedRef.current) return;
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') {
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    };

    if (countdown === 0) {
      playTick(880, 0.5);
      setCountdown(null);
      countdownEndsAtRef.current = null;
      startSession();
      phaseStartedAtRef.current = Date.now();
      setIsActive(true);
      return;
    }

    if (countdownEndsAtRef.current === null) {
      countdownEndsAtRef.current = Date.now() + countdown * 1000;
      playTick(countdown <= 3 ? 660 : 440, 0.08);
    }

    const syncCountdown = () => {
      const endsAt = countdownEndsAtRef.current;
      if (endsAt === null) {
        return;
      }

      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setCountdown(remaining);
    };

    const t = window.setInterval(syncCountdown, 250);
    syncCountdown();
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    const persistSession = async () => {
      if (sessionClosedRef.current) {
        await clearStoredActiveTimerSession();
        return;
      }

      const hasStoredState =
        sessionStartTimeRef.current !== null || countdown !== null || isActive || currentPhaseIndex > 0;

      if (!hasStoredState) {
        await clearStoredActiveTimerSession();
        return;
      }

      const snapshot = {
        recipe: recipeSnapshot,
        timerPhases: phases,
        compensationAddedSeconds,
        currentPhaseIndex,
        timeLeft,
        isActive,
        countdownRemaining: countdown,
        countdownEndsAt: countdownEndsAtRef.current,
        phaseStartedAt: phaseStartedAtRef.current,
        startedAt: sessionStartTimeRef.current,
        agitationOverride,
        updatedAt: Date.now(),
      } satisfies ActiveTimerSession;

      const signature = JSON.stringify(snapshot);
      if (signature === lastPersistedSignatureRef.current) {
        return;
      }

      lastPersistedSignatureRef.current = signature;
      await saveStoredActiveTimerSession(snapshot);
    };

    void persistSession().catch((error) => {
      console.error('Failed to persist active timer session:', error);
    });
  }, [agitationOverride, compensationAddedSeconds, countdown, currentPhaseIndex, isActive, phases, recipeSnapshot, timeLeft]);

  useEffect(() => {
    const acquireWakeLock = async () => {
      if (
        typeof navigator === 'undefined' ||
        !('wakeLock' in navigator) ||
        !isActive ||
        document.visibilityState !== 'visible'
      ) {
        return;
      }

      try {
        const navigatorWithWakeLock = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
        };
        wakeLockRef.current = await navigatorWithWakeLock.wakeLock?.request('screen')!;
      } catch (error) {
        console.error('Failed to acquire wake lock:', error);
      }
    };

    const releaseWakeLock = async () => {
      try {
        await wakeLockRef.current?.release();
      } catch (error) {
        console.error('Failed to release wake lock:', error);
      } finally {
        wakeLockRef.current = null;
      }
    };

    if (isActive) {
      void acquireWakeLock();
    } else {
      void releaseWakeLock();
    }

    return () => {
      void releaseWakeLock();
    };
  }, [isActive]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      if (countdown !== null && countdownEndsAtRef.current !== null) {
        const remaining = Math.max(0, Math.ceil((countdownEndsAtRef.current - Date.now()) / 1000));
        setCountdown(remaining);
      }

      syncTimeLeftFromNow();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [countdown, currentPhaseIndex, isActive, phases]);

  const toggleTimer = () => {
    if (countdown !== null) {
      setCountdown(null); // cancel pre-start countdown
      countdownEndsAtRef.current = null;
    } else if (!isActive && timeLeft === phases[currentPhaseIndex]?.duration) {
      sessionClosedRef.current = false;
      primeAudio();
      void requestFullscreen();
      if (countdownFrom > 0) {
        setCountdown(countdownFrom);
        countdownEndsAtRef.current = Date.now() + countdownFrom * 1000;
      } else {
        startSession();
        phaseStartedAtRef.current = Date.now();
        setIsActive(true);
      }
    } else {
      primeAudio();
      setIsActive((value) => {
        const nextValue = !value;
        if (nextValue) {
          sessionClosedRef.current = false;
          if (sessionStartTimeRef.current === null) {
            startSession();
          }
          phaseStartedAtRef.current = Date.now() - Math.max(0, (phases[currentPhaseIndex].duration - timeLeft) * 1000);
        } else {
          syncTimeLeftFromNow();
          phaseStartedAtRef.current = null;
        }
        return nextValue;
      });
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      primeAudio();
    }

    setIsMuted((value) => !value);
  };

  const resetTimer = () => {
    setIsActive(false);
    setCountdown(null);
    countdownEndsAtRef.current = null;
    phaseStartedAtRef.current = null;
    setIsAgitating(false);
    setFlashVisible(false);
    lastAgitationCueRef.current = null;
    setTimeLeft(phases[currentPhaseIndex].duration);
  };
  const skipPhase = () => {
    if (currentPhaseIndex < phases.length - 1) {
      setCurrentPhaseIndex((prev) => prev + 1);
      setIsActive(false);
      setCountdown(null);
       countdownEndsAtRef.current = null;
      phaseStartedAtRef.current = null;
      setIsAgitating(false);
    }
  };

  const handleExitSession = async () => {
    sessionClosedRef.current = true;
    setIsActive(false);
    setCountdown(null);
    countdownEndsAtRef.current = null;
    phaseStartedAtRef.current = null;
    setIsAgitating(false);
    setFlashVisible(false);
    await clearStoredActiveTimerSession();
    await exitFullscreen();
    if (sessionStartTimeRef.current !== null) {
      await reportSessionEnd(hasProgressRef.current ? 'partial' : 'aborted');
    }
    onExitSession();
  };

  const handleLeaveFullscreen = async () => {
    await exitFullscreen();
  };

  const currentPhase = phases[currentPhaseIndex];
  const progress = currentPhase && currentPhase.duration > 0 ? (timeLeft / currentPhase.duration) * 100 : 0;
  const effectiveAgitationMode = agitationOverride ?? currentPhase?.agitationMode ?? null;
  const agitationDetails = getAgitationDescription(effectiveAgitationMode);

  const AGITATION_CYCLE: AgitationMode[] = ['every-60s', 'every-30s', 'stand'];
  const cycleAgitation = () => {
    const current = effectiveAgitationMode ?? 'stand';
    const idx = AGITATION_CYCLE.indexOf(current);
    const next = AGITATION_CYCLE[(idx + 1) % AGITATION_CYCLE.length];
    lastAgitationCueRef.current = null; // reset so next cycle fires fresh
    setAgitationOverride(next);
  };
  return (
    <motion.div
      ref={containerRef}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.14}
      whileDrag={reduceMotion ? undefined : { scale: 0.995 }}
      onDragEnd={(_event, info) => {
        if (info.offset.x < -90) {
          skipPhase();
        }
      }}
      className={cn(
        "relative overflow-hidden flex flex-col landscape:flex-row bg-dark-panel utilitarian-border w-full transition-colors duration-500 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]",
        isImmersiveMode && "fixed inset-0 z-[70] h-[100dvh] w-screen max-w-none justify-between border-0 bg-dark-bg shadow-none",
        isAgitating ? "border-accent-red" : "border-dark-border"
      )}
      style={
        isImmersiveMode
          ? {
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }
          : undefined
      }
    >
      <AnimatePresence>
        {flashVisible ? (
          <motion.div
            key={flashKey}
            initial={{ opacity: 0 }}
            animate={reduceMotion ? { opacity: [0, 0.14, 0] } : { opacity: [0, 0.22, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.18 : 0.5, ease: 'easeOut' }}
            onAnimationComplete={() => setFlashVisible(false)}
            className="pointer-events-none absolute inset-0 bg-accent-red"
          />
        ) : null}
      </AnimatePresence>

      {/* Left / main: phase header + time + progress */}
      <div
        className={cn(
          "relative flex flex-col items-center landscape:justify-center landscape:flex-1 p-5 sm:p-6 md:p-10 space-y-5 sm:space-y-6 landscape:space-y-4",
          isImmersiveMode && "flex-1 justify-center"
        )}
      >
        <div className="text-center space-y-1">
          <p className="mono-label">
            {countdown !== null ? 'Starting in' : `Phase ${currentPhaseIndex + 1}/${phases.length}`}
          </p>
          <motion.h1
            key={countdown !== null ? '__countdown__' : currentPhase?.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-white uppercase tracking-widest"
          >
            {countdown !== null ? currentPhase?.name : (currentPhase?.name || 'Ready')}
          </motion.h1>
        </div>

        {/* Portrait-only Start/Pause — sits above the countdown so it's always in thumb reach */}
        <button
          onClick={toggleTimer}
          className={cn(
            "press-feedback landscape:hidden w-full py-5 font-bold uppercase tracking-[0.2em] text-base transition-all flex items-center justify-center gap-3",
            countdown !== null
              ? "border border-dark-border text-ui-gray hover:text-white hover:border-white"
              : isActive
                ? "border border-white/20 bg-white/5 text-white hover:bg-white/10"
                : "bg-white text-black hover:bg-accent-red hover:text-white hover:border-accent-red"
          )}
        >
          {countdown !== null ? (
            <>
              <X size={16} />
              <span>Cancel</span>
            </>
          ) : isActive ? (
            <>
              <Pause size={16} fill="currentColor" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Start</span>
            </>
          )}
        </button>

        <div className="flex flex-col items-center justify-center w-full">
          {/* Reserved row for "AGITATING" so it never overlaps the button above */}
          <div className="h-5 flex items-center justify-center">
            <AnimatePresence>
              {isAgitating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  className="text-accent-red font-mono text-[10px] uppercase tracking-[0.4em] font-bold"
                >
                  Agitating
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {countdown !== null ? (
              <motion.div
                key={countdown}
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 16, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn(
                  "whitespace-nowrap font-mono font-bold tabular-nums py-3",
                  "text-[clamp(4.8rem,24vw,8.6rem)] md:text-[clamp(5.8rem,18vw,10rem)] landscape:text-[clamp(4rem,18vh,8rem)]",
                  countdown <= 3 ? "text-accent-red red-glow-strong" : "text-white"
                )}
              >
                {countdown === 0 ? 'GO' : countdown}
              </motion.div>
            ) : (
              <motion.div
                key="timer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "whitespace-nowrap font-mono font-bold tabular-nums transition-colors duration-300 py-3",
                  "text-[clamp(4.8rem,24vw,8.6rem)] md:text-[clamp(5.8rem,18vw,10rem)] landscape:text-[clamp(4rem,18vh,8rem)]",
                  isAgitating ? "text-accent-red red-glow-strong" : "text-white"
                )}
                aria-live="polite"
              >
                {formatTime(timeLeft)}
              </motion.div>
            )}
          </AnimatePresence>

          {compensationAddedSeconds > 0 && currentPhase?.name.toLowerCase() === 'developer' && countdown === null && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-ui-gray -mt-2 mb-1">
              +{formatTime(compensationAddedSeconds)} reuse comp.
            </p>
          )}

          <div className="w-full h-px bg-dark-border relative overflow-hidden">
            <motion.div
              className={cn("absolute top-0 left-0 h-full", isAgitating ? "bg-white" : "bg-accent-red")}
              animate={{ width: countdown !== null ? '100%' : `${progress}%` }}
              transition={{ duration: countdown !== null ? 10 : 1, ease: "linear" }}
            />
          </div>
        </div>
      </div>

      {/* Right / sidebar: agitation + controls + upcoming */}
      <div className="relative flex flex-col landscape:justify-between landscape:w-64 landscape:border-l landscape:border-dark-border p-4 sm:p-6 landscape:p-5 space-y-5 sm:space-y-6 landscape:space-y-4 border-t landscape:border-t-0 border-dark-border">

        {currentPhase && (
          <button
            type="button"
            onClick={cycleAgitation}
            className={cn(
              "w-full text-left px-4 py-4 utilitarian-border transition-colors",
              isAgitating ? "bg-accent-red/10 border-accent-red/50" : "bg-dark-bg border-dark-border"
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="mono-label">Agitation</p>
              <span className="font-mono text-xs uppercase tracking-wider text-ui-gray">
                {getAgitationLabel(AGITATION_CYCLE[(AGITATION_CYCLE.indexOf(effectiveAgitationMode ?? 'stand') + 1) % AGITATION_CYCLE.length])} →
              </span>
            </div>
            <p className="text-sm text-ui-gray italic leading-relaxed" role="alert">
              {agitationDetails ?? 'Stand — no agitation.'}
            </p>
          </button>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-2">
          {/* Landscape-only Start button */}
          <button
            onClick={toggleTimer}
            className={cn(
              "press-feedback w-full py-3 font-bold uppercase tracking-[0.2em] text-sm transition-all hidden landscape:flex items-center justify-center gap-2",
              countdown !== null
                ? "border border-dark-border text-ui-gray hover:text-white hover:border-white"
                : isActive
                  ? "border border-white/20 bg-white/5 text-white hover:bg-white/10"
                  : "bg-white text-black hover:bg-accent-red hover:text-white"
            )}
          >
            {countdown !== null ? <><X size={14} /><span>Cancel</span></> : isActive ? <><Pause size={14} fill="currentColor" /><span>Pause</span></> : <><Play size={14} fill="currentColor" /><span>Start</span></>}
          </button>

          {/* Icon buttons — portrait and landscape */}
          <div className="flex items-center justify-center gap-3 landscape:gap-2">
            <button
              onClick={toggleMute}
              className="utilitarian-button flex h-12 w-12 min-w-0 items-center justify-center px-0 py-0"
              aria-label={isMuted ? 'Unmute timer sounds' : 'Mute timer sounds'}
            >
              {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
            </button>
            <button
              onClick={resetTimer}
              className="utilitarian-button flex h-12 w-12 min-w-0 items-center justify-center px-0 py-0"
              aria-label="Reset current phase"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={skipPhase}
              className="utilitarian-button flex h-12 w-12 min-w-0 items-center justify-center px-0 py-0"
              aria-label="Skip current phase"
            >
              <SkipForward size={16} />
            </button>
            {!isImmersiveMode && (
              <button
                type="button"
                onPointerDown={handleFullscreenButtonPointerDown}
                onClick={handleFullscreenButtonClick}
                className="utilitarian-button flex h-12 w-12 min-w-0 items-center justify-center px-0 py-0"
                aria-label="Enter fullscreen"
              >
                <Maximize size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-4 landscape:pt-0 border-t landscape:border-t-0 border-dark-border landscape:border-none">
          <p className="mono-label">Swipe left to skip</p>
          {phases.slice(currentPhaseIndex + 1, currentPhaseIndex + 5).map((phase, i) => (
            <div key={i} className="flex justify-between items-center text-xs font-mono text-ui-gray uppercase">
              <span>{phase.name}</span>
              <span>{formatTime(phase.duration)}</span>
            </div>
          ))}
        </div>

        {isImmersiveMode && (
          <div className="flex justify-center pt-2 sm:pt-3">
            <div className="flex items-center gap-0.5 p-1 rounded-[1.5rem] bg-black/60 backdrop-blur-2xl border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_32px_rgba(0,0,0,0.6)]">
              <button
                type="button"
                onClick={() => void handleLeaveFullscreen()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[1.2rem] font-mono text-[10px] uppercase tracking-widest text-white/45 hover:text-white/75 transition-colors"
                aria-label="Leave fullscreen"
              >
                <Minimize size={12} />
                <span>Windowed</span>
              </button>
              <button
                type="button"
                onClick={() => void handleExitSession()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[1.2rem] font-mono text-[10px] uppercase tracking-widest text-white/45 hover:text-white/75 transition-colors"
                aria-label="Exit session"
              >
                <X size={12} />
                <span>Exit</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
};
