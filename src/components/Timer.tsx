import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, SkipForward, Bell, BellOff, Minimize, Maximize, X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { formatTime, cn } from '../lib/utils';
import {
  DevPhase,
  getAgitationDescription,
  getAgitationInterval,
  type SessionStatus,
} from '../services/recipe';
import { showNotification } from '../services/notifications';
import type { UserSettings } from '../services/userSettings';

export interface TimerSessionResult {
  startTime: number;
  endTime: number;
  status: SessionStatus;
  phasesCompleted: number;
}

interface TimerProps {
  phases: DevPhase[];
  onComplete: () => void;
  onExitSession: () => void;
  onSessionEnd: (result: TimerSessionResult) => Promise<void> | void;
  settings: UserSettings;
}

export const Timer: React.FC<TimerProps> = ({
  phases,
  onComplete,
  onExitSession,
  onSessionEnd,
  settings,
}) => {
  const notificationsEnabled = settings.notificationsEnabled;
  const countdownFrom = settings.phaseCountdown;
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(phases[0]?.duration || 0);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgitating, setIsAgitating] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashVisible, setFlashVisible] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersiveFallback, setIsImmersiveFallback] = useState(false);
  const isMutedRef = useRef(isMuted);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ownsFullscreenRef = useRef(false);
  const reduceMotion = useReducedMotion();

  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAgitationCueRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const hasProgressRef = useRef(false);
  const phasesCompletedRef = useRef(0);
  const sessionReportedRef = useRef(false);

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

    if (!ownsFullscreenRef.current || typeof document === 'undefined' || !document.exitFullscreen) {
      ownsFullscreenRef.current = false;
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
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
      if (canUseImmersiveFallback()) {
        setIsImmersiveFallback(true);
        return;
      }

      console.error('Failed to enter fullscreen:', error);
    }
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

    sessionStartTimeRef.current = Date.now();
    hasProgressRef.current = false;
    phasesCompletedRef.current = 0;
    sessionReportedRef.current = false;
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
    setCurrentPhaseIndex(0);
    setTimeLeft(phases[0]?.duration || 0);
    setIsActive(false);
    setCountdown(null);
    setIsAgitating(false);
    setFlashVisible(false);
    setIsImmersiveFallback(false);
    lastAgitationCueRef.current = null;
    sessionStartTimeRef.current = null;
    hasProgressRef.current = false;
    phasesCompletedRef.current = 0;
    sessionReportedRef.current = false;
  }, [phases]);

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

    setTimeLeft(phases[currentPhaseIndex].duration);
    setIsAgitating(false);
    setFlashVisible(false);
    lastAgitationCueRef.current = null;
  }, [phases, currentPhaseIndex]);

  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next < phases[currentPhaseIndex].duration) {
            hasProgressRef.current = true;
          }

          return next;
        });
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      playBeep(880, 0.5); // End of phase beep
      if (currentPhaseIndex < phases.length - 1) {
        const nextPhase = phases[currentPhaseIndex + 1];
        phasesCompletedRef.current = currentPhaseIndex + 1;
        if (notificationsEnabled) {
          showNotification(`${phases[currentPhaseIndex].name} complete`, `Next: ${nextPhase.name}`);
        }
        triggerVibration(120);
        setCurrentPhaseIndex((prev) => prev + 1);
        setIsActive(false);
      } else {
        phasesCompletedRef.current = phases.length;
        if (notificationsEnabled) {
          showNotification('Development complete', 'All phases finished.');
        }
        triggerVibration([160, 120, 220]);
        setIsActive(false);
        void (async () => {
          await exitFullscreen();
          await reportSessionEnd('completed', phases.length);
          onComplete();
        })();
      }
    }

    return () => clearInterval(interval);
  }, [currentPhaseIndex, isActive, notificationsEnabled, onComplete, onSessionEnd, phases, timeLeft]);

  // Agitation Logic
  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      setIsAgitating(false);
      return;
    }

    const currentPhase = phases[currentPhaseIndex];
    const agitationInterval = getAgitationInterval(currentPhase.agitationMode);

    if (!agitationInterval) {
      setIsAgitating(false);
      return;
    }

    const elapsed = currentPhase.duration - timeLeft;
    const cycleTime = elapsed % agitationInterval;
    const agitating = elapsed > 0 && cycleTime < AGITATION_ALERT_SECONDS;
    const agitationDetails = currentPhase.agitation ?? getAgitationDescription(currentPhase.agitationMode);

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

  }, [currentPhaseIndex, isActive, notificationsEnabled, phases, timeLeft]);

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
      startSession();
      setIsActive(true);
      return;
    }

    playTick(countdown <= 3 ? 660 : 440, 0.08);
    const t = window.setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const toggleTimer = () => {
    if (countdown !== null) {
      setCountdown(null); // cancel pre-start countdown
    } else if (!isActive && timeLeft === phases[currentPhaseIndex]?.duration) {
      primeAudio();
      void requestFullscreen();
      if (countdownFrom > 0) {
        setCountdown(countdownFrom);
      } else {
        startSession();
        setIsActive(true);
      }
    } else {
      primeAudio();
      setIsActive((v) => !v); // pause / resume
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
      setIsAgitating(false);
    }
  };

  const handleExitSession = async () => {
    setIsActive(false);
    setCountdown(null);
    setIsAgitating(false);
    setFlashVisible(false);
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
  const agitationDetails = currentPhase?.agitation ?? getAgitationDescription(currentPhase?.agitationMode);
  const portraitControlsClassName = isImmersiveMode
    ? "grid grid-cols-[2.75rem_2.75rem_minmax(0,1fr)_2.75rem] items-center justify-center gap-2"
    : "grid grid-cols-[2.75rem_2.75rem_minmax(0,1fr)_2.75rem_2.75rem] items-center justify-center gap-2";

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

        <div className="relative flex flex-col items-center justify-center w-full">
          <AnimatePresence>
            {isAgitating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="absolute -top-5 text-accent-red font-mono text-[10px] uppercase tracking-[0.4em] font-bold"
              >
                Agitating
              </motion.div>
            )}
          </AnimatePresence>

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

        {agitationDetails && (
          <div className={cn(
            "p-3 utilitarian-border transition-colors",
            isAgitating ? "bg-accent-red/10 border-accent-red/50" : "bg-dark-bg border-dark-border"
          )}>
            <p className="mono-label mb-1">Agitation</p>
            <p className="text-xs text-ui-gray italic leading-relaxed" role="alert">{agitationDetails}</p>
          </div>
        )}

        {/* Portrait: single row. Landscape: Start full-width, icon buttons below */}
        <div className="flex flex-col gap-0 landscape:gap-2">
          <button
            onClick={toggleTimer}
            className={cn(
              "press-feedback w-full py-3 font-bold uppercase tracking-widest text-sm transition-all hidden landscape:block",
              isActive ? "bg-dark-border text-white" : "bg-white text-black hover:bg-accent-red hover:text-white"
            )}
          >
            {countdown !== null ? 'Cancel' : isActive ? 'Pause' : 'Start'}
          </button>
          <div
            className={cn(
              portraitControlsClassName,
              "landscape:flex landscape:items-center landscape:justify-between landscape:space-x-0"
            )}
          >
            <button
              onClick={toggleMute}
              className="utilitarian-button flex h-11 w-11 min-w-0 items-center justify-center px-0 py-0 sm:h-12 sm:w-12"
              aria-label={isMuted ? 'Unmute timer sounds' : 'Mute timer sounds'}
            >
              {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
            </button>
            <button
              onClick={resetTimer}
              className="utilitarian-button flex h-11 w-11 min-w-0 items-center justify-center px-0 py-0 sm:h-12 sm:w-12"
              aria-label="Reset current phase"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={toggleTimer}
              className={cn(
                "press-feedback landscape:hidden min-w-0 px-3 py-3 font-bold uppercase tracking-[0.18em] text-[0.78rem] transition-all",
                isActive ? "bg-dark-border text-white" : "bg-white text-black hover:bg-accent-red hover:text-white"
              )}
            >
              {countdown !== null ? 'Cancel' : isActive ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={skipPhase}
              className="utilitarian-button flex h-11 w-11 min-w-0 items-center justify-center px-0 py-0 sm:h-12 sm:w-12"
              aria-label="Skip current phase"
            >
              <SkipForward size={16} />
            </button>
            {!isImmersiveMode && (
              <button
                onClick={() => void requestFullscreen()}
                className="utilitarian-button flex h-11 w-11 min-w-0 items-center justify-center px-0 py-0 sm:h-12 sm:w-12"
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
