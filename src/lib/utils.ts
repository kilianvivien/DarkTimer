import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DevPhase } from '../services/recipe';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function applyDeveloperCompensation(phases: DevPhase[], percent: number): DevPhase[] {
  if (percent === 0) return phases;
  const idx = phases.findIndex((p) => p.name.toLowerCase() === 'developer');
  if (idx === -1) return phases;
  const added = Math.round(phases[idx].duration * percent / 100);
  return phases.map((p, i) => i === idx ? { ...p, duration: p.duration + added } : p);
}
