import { describe, expect, it } from 'vitest';
import { crossedAgitationPoint, getPhaseCues } from './cueSchedule';

describe('getPhaseCues', () => {
  it('lists agitation points followed by the phase end', () => {
    expect(getPhaseCues(150, 60)).toEqual([
      { kind: 'agitation', atSeconds: 60 },
      { kind: 'agitation', atSeconds: 120 },
      { kind: 'phase-end', atSeconds: 150 },
    ]);
  });

  it('drops an agitation point that coincides with the phase end', () => {
    expect(getPhaseCues(60, 30)).toEqual([
      { kind: 'agitation', atSeconds: 30 },
      { kind: 'phase-end', atSeconds: 60 },
    ]);
  });

  it('only cues the phase end for stand development', () => {
    expect(getPhaseCues(600, null)).toEqual([{ kind: 'phase-end', atSeconds: 600 }]);
  });

  it('returns nothing for an empty phase', () => {
    expect(getPhaseCues(0, 60)).toEqual([]);
  });
});

describe('crossedAgitationPoint', () => {
  it('fires on the exact agitation second', () => {
    expect(crossedAgitationPoint(59, 60, 60)).toBe(true);
    expect(crossedAgitationPoint(null, 60, 60)).toBe(true);
  });

  it('fires when a delayed tick jumps over the agitation second', () => {
    expect(crossedAgitationPoint(58, 62, 60)).toBe(true);
  });

  it('does not fire again once past the point', () => {
    expect(crossedAgitationPoint(61, 62, 60)).toBe(false);
  });

  it('does not fire when joining mid-cycle with no earlier observation', () => {
    expect(crossedAgitationPoint(null, 62, 60)).toBe(false);
  });

  it('does not fire before the first interval', () => {
    expect(crossedAgitationPoint(0, 5, 60)).toBe(false);
  });
});
