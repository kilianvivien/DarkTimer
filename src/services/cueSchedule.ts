type PhaseCueKind = 'agitation' | 'phase-end';

export interface PhaseCue {
  kind: PhaseCueKind;
  // Seconds from the start of the phase.
  atSeconds: number;
}

// Every audible cue in a phase: one per agitation interval, then the phase end.
// An agitation point that lands on the phase end is dropped in favour of it.
export function getPhaseCues(durationSeconds: number, agitationInterval: number | null): PhaseCue[] {
  if (!(durationSeconds > 0)) {
    return [];
  }

  const cues: PhaseCue[] = [];

  if (agitationInterval && agitationInterval > 0) {
    for (let at = agitationInterval; at < durationSeconds; at += agitationInterval) {
      cues.push({ kind: 'agitation', atSeconds: at });
    }
  }

  cues.push({ kind: 'phase-end', atSeconds: durationSeconds });

  return cues;
}

// True when the timer moved onto or past an agitation point since it was last
// observed, so a delayed tick still raises the cue instead of skipping it.
export function crossedAgitationPoint(
  previousElapsed: number | null,
  elapsed: number,
  agitationInterval: number,
): boolean {
  const boundary = Math.floor(elapsed / agitationInterval) * agitationInterval;

  if (boundary <= 0) {
    return false;
  }

  return elapsed === boundary || (previousElapsed !== null && previousElapsed < boundary);
}
