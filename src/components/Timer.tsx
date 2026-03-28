import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatTime, cn } from '../lib/utils';
import { DevPhase } from '../services/gemini';
import { getSettings } from '../services/settings';

interface TimerProps {
  phases: DevPhase[];
  onComplete: () => void;
}

export const Timer: React.FC<TimerProps> = ({ phases, onComplete }) => {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(phases[0]?.duration || 0);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgitating, setIsAgitating] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const settings = getSettings();

  useEffect(() => {
    if (phases.length > 0) {
      setTimeLeft(phases[currentPhaseIndex].duration);
    }
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
        setCurrentPhaseIndex((prev) => prev + 1);
        setIsActive(false);
      } else {
        setIsActive(false);
        onComplete();
      }
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, currentPhaseIndex, phases]);

  // Agitation Logic
  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      setIsAgitating(false);
      return;
    }

    const currentPhase = phases[currentPhaseIndex];
    // Only agitate for Developer or if specified in agitation notes
    const shouldAgitate = currentPhase.name.toLowerCase().includes('dev') || currentPhase.agitation;
    
    if (!shouldAgitate) {
      setIsAgitating(false);
      return;
    }

    const elapsed = currentPhase.duration - timeLeft;
    const cycleTime = elapsed % settings.agitationInterval;
    
    const agitating = cycleTime < settings.agitationDuration;
    
    if (agitating && !isAgitating) {
      playBeep(440, 0.2); // Agitation start beep
    }
    
    setIsAgitating(agitating);

  }, [timeLeft, isActive, currentPhaseIndex, phases, settings]);

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

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(phases[currentPhaseIndex].duration);
  };
  const skipPhase = () => {
    if (currentPhaseIndex < phases.length - 1) {
      setCurrentPhaseIndex((prev) => prev + 1);
      setIsActive(false);
    }
  };

  const currentPhase = phases[currentPhaseIndex];
  const progress = currentPhase ? (timeLeft / currentPhase.duration) * 100 : 0;

  return (
    <div className={cn(
      "flex flex-col items-center space-y-8 p-10 bg-dark-panel utilitarian-border max-w-md w-full transition-colors duration-500",
      isAgitating ? "border-accent-red" : "border-dark-border"
    )}>
      <div className="text-center space-y-1">
        <p className="mono-label">Phase {currentPhaseIndex + 1}/{phases.length}</p>
        <motion.h1 
          key={currentPhase?.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold text-white uppercase tracking-widest"
        >
          {currentPhase?.name || 'Ready'}
        </motion.h1>
      </div>

      <div className="relative flex flex-col items-center justify-center w-full py-4">
        <AnimatePresence>
          {isAgitating && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="absolute -top-4 text-accent-red font-mono text-[10px] uppercase tracking-[0.4em] font-bold"
            >
              Agitating
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn(
          "text-8xl font-mono font-bold tabular-nums transition-colors duration-300",
          isAgitating ? "text-accent-red red-glow" : "text-white"
        )}>
          {formatTime(timeLeft)}
        </div>
        
        <div className="w-full h-1 bg-dark-border mt-6 relative overflow-hidden">
          <motion.div 
            className={cn("absolute top-0 left-0 h-full", isAgitating ? "bg-white" : "bg-accent-red")}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
      </div>

      {currentPhase?.agitation && (
        <div className={cn(
          "w-full p-3 utilitarian-border transition-colors",
          isAgitating ? "bg-accent-red/10 border-accent-red/50" : "bg-dark-bg border-dark-border"
        )}>
          <p className="mono-label mb-1">Agitation</p>
          <p className="text-xs text-ui-gray italic leading-relaxed">{currentPhase.agitation}</p>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="utilitarian-button p-3"
        >
          {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
        </button>

        <button 
          onClick={resetTimer}
          className="utilitarian-button p-3"
        >
          <RotateCcw size={16} />
        </button>

        <button 
          onClick={toggleTimer}
          className={cn(
            "px-8 py-3 font-bold uppercase tracking-widest text-sm transition-all",
            isActive ? "bg-dark-border text-white" : "bg-white text-black hover:bg-accent-red hover:text-white"
          )}
        >
          {isActive ? 'Pause' : 'Start'}
        </button>

        <button 
          onClick={skipPhase}
          className="utilitarian-button p-3"
        >
          <SkipForward size={16} />
        </button>
      </div>

      <div className="w-full space-y-2 pt-4 border-t border-dark-border">
        {phases.slice(currentPhaseIndex + 1, currentPhaseIndex + 5).map((phase, i) => (
          <div key={i} className="flex justify-between items-center text-[10px] font-mono text-ui-gray uppercase">
            <span>{phase.name}</span>
            <span>{formatTime(phase.duration)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

