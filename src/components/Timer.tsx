import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, SkipForward, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatTime, cn } from '../lib/utils';
import { DevPhase, getAgitationDescription, getAgitationInterval } from '../services/recipe';
import { getSettings } from '../services/settings';
import { showNotification } from '../services/notifications';

interface TimerProps {
  phases: DevPhase[];
  onComplete: () => void;
}

export const Timer: React.FC<TimerProps> = ({ phases, onComplete }) => {
  const settings = getSettings();
  const notificationsEnabled = settings.notificationsEnabled;
  const COUNTDOWN_FROM = settings.phaseCountdown;
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(phases[0]?.duration || 0);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgitating, setIsAgitating] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const isMutedRef = useRef(isMuted);

  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAgitationCueRef = useRef<string | null>(null);

  const AGITATION_ALERT_SECONDS = 5;

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    setCurrentPhaseIndex(0);
    setTimeLeft(phases[0]?.duration || 0);
    setIsActive(false);
    setCountdown(null);
    setIsAgitating(false);
    lastAgitationCueRef.current = null;
  }, [phases]);

  useEffect(() => {
    if (!phases[currentPhaseIndex]) {
      return;
    }

    setTimeLeft(phases[currentPhaseIndex].duration);
    setIsAgitating(false);
    lastAgitationCueRef.current = null;
  }, [phases, currentPhaseIndex]);

  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      playBeep(880, 0.5); // End of phase beep
      if (currentPhaseIndex < phases.length - 1) {
        const nextPhase = phases[currentPhaseIndex + 1];
        if (notificationsEnabled) {
          showNotification(`${phases[currentPhaseIndex].name} complete`, `Next: ${nextPhase.name}`);
        }
        setCurrentPhaseIndex((prev) => prev + 1);
        setIsActive(false);
      } else {
        if (notificationsEnabled) {
          showNotification('Development complete', 'All phases finished.');
        }
        setIsActive(false);
        onComplete();
      }
    }

    return () => clearInterval(interval);
  }, [currentPhaseIndex, isActive, notificationsEnabled, onComplete, phases, timeLeft]);

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
        playBeep(440, 0.2); // Agitation start beep
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
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
      const ctx = audioContextRef.current;
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
      setIsActive(true);
      return;
    }

    playTick(countdown <= 3 ? 660 : 440, 0.08);
    const t = window.setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const playBeep = (freq: number, duration: number) => {
    if (isMuted) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
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

  const toggleTimer = () => {
    if (countdown !== null) {
      setCountdown(null); // cancel pre-start countdown
    } else if (!isActive && timeLeft === phases[currentPhaseIndex]?.duration) {
      // Fresh start for this phase — use countdown if configured
      if (COUNTDOWN_FROM > 0) {
        setCountdown(COUNTDOWN_FROM);
      } else {
        setIsActive(true);
      }
    } else {
      setIsActive((v) => !v); // pause / resume
    }
  };
  const resetTimer = () => {
    setIsActive(false);
    setCountdown(null);
    setIsAgitating(false);
    lastAgitationCueRef.current = null;
    setTimeLeft(phases[currentPhaseIndex].duration);
  };
  const skipPhase = () => {
    if (currentPhaseIndex < phases.length - 1) {
      setCurrentPhaseIndex((prev) => prev + 1);
      setIsActive(false);
    }
  };

  const currentPhase = phases[currentPhaseIndex];
  const progress = currentPhase && currentPhase.duration > 0 ? (timeLeft / currentPhase.duration) * 100 : 0;
  const agitationDetails = currentPhase?.agitation ?? getAgitationDescription(currentPhase?.agitationMode);

  return (
    <div className={cn(
      "flex flex-col landscape:flex-row bg-dark-panel utilitarian-border w-full transition-colors duration-500",
      isAgitating ? "border-accent-red" : "border-dark-border"
    )}>

      {/* Left / main: phase header + time + progress */}
      <div className="flex flex-col items-center landscape:items-start landscape:justify-center landscape:flex-1 p-6 md:p-10 space-y-6 landscape:space-y-4">
        <div className="text-center landscape:text-left space-y-1">
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

        <div className="relative flex flex-col items-center landscape:items-start justify-center w-full">
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
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "whitespace-nowrap font-mono font-bold tabular-nums py-3",
                  "text-[clamp(3.5rem,18vw,6rem)] landscape:text-[clamp(3rem,20vh,6rem)]",
                  countdown <= 3 ? "text-accent-red red-glow" : "text-white"
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
                  "text-[clamp(3.5rem,18vw,6rem)] landscape:text-[clamp(3rem,20vh,6rem)]",
                  isAgitating ? "text-accent-red red-glow" : "text-white"
                )}
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
      <div className="flex flex-col landscape:justify-between landscape:w-56 landscape:border-l landscape:border-dark-border p-6 landscape:p-5 space-y-6 landscape:space-y-4 border-t landscape:border-t-0 border-dark-border">

        {agitationDetails && (
          <div className={cn(
            "p-3 utilitarian-border transition-colors",
            isAgitating ? "bg-accent-red/10 border-accent-red/50" : "bg-dark-bg border-dark-border"
          )}>
            <p className="mono-label mb-1">Agitation</p>
            <p className="text-xs text-ui-gray italic leading-relaxed">{agitationDetails}</p>
          </div>
        )}

        {/* Portrait: single row. Landscape: Start full-width, icon buttons below */}
        <div className="flex flex-col landscape:gap-2 gap-0">
          <button
            onClick={toggleTimer}
            className={cn(
              "w-full py-3 font-bold uppercase tracking-widest text-sm transition-all hidden landscape:block",
              isActive ? "bg-dark-border text-white" : "bg-white text-black hover:bg-accent-red hover:text-white"
            )}
          >
            {countdown !== null ? 'Cancel' : isActive ? 'Pause' : 'Start'}
          </button>
          <div className="flex items-center justify-center landscape:justify-between space-x-3 landscape:space-x-0">
            <button onClick={() => setIsMuted(!isMuted)} className="utilitarian-button p-3">
              {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
            </button>
            <button onClick={resetTimer} className="utilitarian-button p-3">
              <RotateCcw size={16} />
            </button>
            <button
              onClick={toggleTimer}
              className={cn(
                "flex-1 landscape:hidden px-6 py-3 font-bold uppercase tracking-widest text-sm transition-all",
                isActive ? "bg-dark-border text-white" : "bg-white text-black hover:bg-accent-red hover:text-white"
              )}
            >
              {countdown !== null ? 'Cancel' : isActive ? 'Pause' : 'Start'}
            </button>
            <button onClick={skipPhase} className="utilitarian-button p-3">
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-2 pt-4 landscape:pt-0 border-t landscape:border-t-0 border-dark-border landscape:border-none">
          {phases.slice(currentPhaseIndex + 1, currentPhaseIndex + 5).map((phase, i) => (
            <div key={i} className="flex justify-between items-center text-xs font-mono text-ui-gray uppercase">
              <span>{phase.name}</span>
              <span>{formatTime(phase.duration)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
