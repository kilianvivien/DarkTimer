import type { UserSettings } from './settings';

export type ProcessMode = 'bw' | 'color';
export type AgitationMode = 'every-60s' | 'every-30s' | 'stand';
export type SessionStatus = 'completed' | 'partial' | 'aborted';

export interface DevPhase {
  name: string;
  duration: number;
  agitation?: string;
  agitationMode?: AgitationMode | null;
}

export interface DevRecipe {
  film: string;
  developer: string;
  dilution: string;
  iso: number;
  tempC: number;
  processMode: ProcessMode;
  phases: DevPhase[];
  notes: string;
  source?: string;
}

export interface Session {
  id: string;
  recipe: DevRecipe;
  startTime: number;
  endTime: number;
  status: SessionStatus;
  phasesCompleted: number;
}

export interface ActiveTimerSession {
  recipe: DevRecipe;
  timerPhases: DevPhase[];
  compensationAddedSeconds: number;
  currentPhaseIndex: number;
  timeLeft: number;
  isActive: boolean;
  countdownRemaining: number | null;
  countdownEndsAt: number | null;
  phaseStartedAt: number | null;
  startedAt: number | null;
  agitationOverride: AgitationMode | null;
  updatedAt: number;
}

export const DEFAULT_BW_TEMP_C = 20;
export const DEFAULT_COLOR_TEMP_C = 38;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProcessMode(value: unknown): value is ProcessMode {
  return value === 'bw' || value === 'color';
}

function isAgitationMode(value: unknown): value is AgitationMode {
  return value === 'every-60s' || value === 'every-30s' || value === 'stand';
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  return null;
}

export function parseTemperatureC(value: unknown): number | null {
  return parseNumber(value);
}

export function formatTemperature(tempC: number): string {
  const normalized = Number.isInteger(tempC) ? tempC : Number(tempC.toFixed(1));
  return `${normalized}°C`;
}

export function getProcessLabel(mode: ProcessMode): string {
  return mode === 'bw' ? 'Black & White' : 'Color Negative & Slide';
}

export function getDefaultTempC(
  settings: Pick<UserSettings, 'defaultBwTempC' | 'defaultColorTempC'>,
  mode: ProcessMode,
): number {
  return mode === 'bw' ? settings.defaultBwTempC : settings.defaultColorTempC;
}

export function getAgitationLabel(mode: AgitationMode): string {
  switch (mode) {
    case 'every-60s':
      return '1m';
    case 'every-30s':
      return '30 sec';
    case 'stand':
      return 'Stand';
  }
}

export function getAgitationDescription(mode?: AgitationMode | null): string | undefined {
  switch (mode) {
    case 'every-60s':
      return 'Agitate every 1 minute.';
    case 'every-30s':
      return 'Agitate every 30 seconds.';
    case 'stand':
      return 'Stand with no agitation cues.';
    default:
      return undefined;
  }
}

export function getAgitationInterval(mode?: AgitationMode | null): number | null {
  switch (mode) {
    case 'every-60s':
      return 60;
    case 'every-30s':
      return 30;
    default:
      return null;
  }
}

function inferAgitationMode(value: unknown): AgitationMode | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toLowerCase();

  if (
    normalized.includes('stand') ||
    normalized.includes('no agitation') ||
    normalized.includes('without agitation')
  ) {
    return 'stand';
  }

  if (
    normalized.includes('every 30 sec') ||
    normalized.includes('every 30 second') ||
    normalized.includes('every 30s')
  ) {
    return 'every-30s';
  }

  if (
    normalized.includes('every 1 min') ||
    normalized.includes('every 1m') ||
    normalized.includes('every minute') ||
    normalized.includes('every 60 sec') ||
    normalized.includes('every 60s')
  ) {
    return 'every-60s';
  }

  return null;
}

export function normalizePhase(phase: unknown): DevPhase {
  if (!isRecord(phase)) {
    return { name: 'Phase', duration: 0, agitationMode: null };
  }

  const duration = parseNumber(phase.duration) ?? 0;
  const agitation = typeof phase.agitation === 'string' ? phase.agitation : undefined;
  const agitationMode = isAgitationMode(phase.agitationMode)
    ? phase.agitationMode
    : inferAgitationMode(agitation);

  return {
    name: typeof phase.name === 'string' && phase.name.trim() ? phase.name : 'Phase',
    duration: Math.max(0, Math.round(duration)),
    agitation,
    agitationMode,
  };
}

interface NormalizeRecipeFallback {
  processMode?: ProcessMode;
  tempC?: number;
}

export function normalizeRecipe(
  recipe: unknown,
  fallback: NormalizeRecipeFallback = {},
): DevRecipe {
  const raw = isRecord(recipe) ? recipe : {};
  const processMode = isProcessMode(raw.processMode)
    ? raw.processMode
    : fallback.processMode ?? 'bw';
  const fallbackTempC =
    fallback.tempC ??
    (processMode === 'bw' ? DEFAULT_BW_TEMP_C : DEFAULT_COLOR_TEMP_C);
  const tempC = parseTemperatureC(raw.tempC ?? raw.temp) ?? fallbackTempC;
  const phases = Array.isArray(raw.phases) ? raw.phases.map(normalizePhase) : [];

  return {
    film: typeof raw.film === 'string' && raw.film.trim() ? raw.film : 'Custom Film',
    developer:
      typeof raw.developer === 'string' && raw.developer.trim()
        ? raw.developer
        : 'Custom Dev',
    dilution: typeof raw.dilution === 'string' && raw.dilution.trim() ? raw.dilution : 'N/A',
    iso: Math.max(0, Math.round(parseNumber(raw.iso) ?? 400)),
    tempC,
    processMode,
    phases,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    source: typeof raw.source === 'string' ? raw.source : undefined,
  };
}

export function normalizeActiveTimerSession(session: unknown): ActiveTimerSession | null {
  if (!isRecord(session)) {
    return null;
  }

  const timerPhases = Array.isArray(session.timerPhases) ? session.timerPhases.map(normalizePhase) : [];

  if (timerPhases.length === 0) {
    return null;
  }

  const readNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  const readBoundedIndex = (value: unknown): number => {
    const parsed = readNumber(value);
    if (parsed === null) {
      return 0;
    }

    return Math.min(timerPhases.length - 1, Math.max(0, Math.round(parsed)));
  };

  const readAgitation = (value: unknown): AgitationMode | null =>
    isAgitationMode(value) ? value : null;

  const currentPhaseIndex = readBoundedIndex(session.currentPhaseIndex);
  const fallbackTimeLeft = timerPhases[currentPhaseIndex]?.duration ?? 0;

  return {
    recipe: normalizeRecipe(session.recipe),
    timerPhases,
    compensationAddedSeconds: Math.max(0, Math.round(readNumber(session.compensationAddedSeconds) ?? 0)),
    currentPhaseIndex,
    timeLeft: Math.max(0, Math.round(readNumber(session.timeLeft) ?? fallbackTimeLeft)),
    isActive: session.isActive === true,
    countdownRemaining:
      session.countdownRemaining === null
        ? null
        : Math.max(0, Math.round(readNumber(session.countdownRemaining) ?? 0)),
    countdownEndsAt: readNumber(session.countdownEndsAt),
    phaseStartedAt: readNumber(session.phaseStartedAt),
    startedAt: readNumber(session.startedAt),
    agitationOverride: readAgitation(session.agitationOverride),
    updatedAt: readNumber(session.updatedAt) ?? Date.now(),
  };
}
