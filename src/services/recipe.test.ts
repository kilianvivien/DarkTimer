import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BW_TEMP_C,
  DEFAULT_COLOR_TEMP_C,
  formatTemperature,
  getAgitationDescription,
  getAgitationInterval,
  getDefaultTempC,
  normalizePhase,
  normalizeRecipe,
  parseTemperatureC,
} from './recipe';

describe('recipe helpers', () => {
  it('normalizes recipe values with sensible defaults and inferred agitation', () => {
    const recipe = normalizeRecipe({
      film: 'HP5 Plus',
      developer: 'ID-11',
      dilution: '',
      iso: '401',
      temp: '20.3 C',
      phases: [
        { name: 'Developer', duration: '6m 30s', agitation: 'Agitate every 1 minute.' },
        { duration: -10, agitation: 'no agitation' },
      ],
    });

    expect(recipe).toMatchObject({
      film: 'HP5 Plus',
      developer: 'ID-11',
      dilution: 'N/A',
      iso: 401,
      tempC: 20.3,
      processMode: 'bw',
      notes: '',
    });
    expect(recipe.phases).toEqual([
      {
        name: 'Developer',
        duration: 6,
        agitation: 'Agitate every 1 minute.',
        agitationMode: 'every-60s',
      },
      {
        name: 'Phase',
        duration: 0,
        agitation: 'no agitation',
        agitationMode: 'stand',
      },
    ]);
  });

  it('uses provided fallbacks for process mode and temperature', () => {
    const recipe = normalizeRecipe(
      {
        film: '',
        developer: '',
        iso: 'bad-value',
      },
      {
        processMode: 'color',
        tempC: 39,
      },
    );

    expect(recipe).toMatchObject({
      film: 'Custom Film',
      developer: 'Custom Dev',
      iso: 400,
      tempC: 39,
      processMode: 'color',
    });
  });

  it('normalizes a single phase and clamps invalid values', () => {
    expect(normalizePhase('nope')).toEqual({
      name: 'Phase',
      duration: 0,
      agitationMode: null,
    });
  });

  it('parses and formats temperature values', () => {
    expect(parseTemperatureC('38.5C')).toBe(38.5);
    expect(formatTemperature(20)).toBe('20°C');
    expect(formatTemperature(20.25)).toBe('20.3°C');
  });

  it('exposes agitation labels and default process temperatures', () => {
    expect(getAgitationDescription('every-30s')).toBe('Agitate every 30 seconds.');
    expect(getAgitationInterval('stand')).toBeNull();
    expect(getAgitationInterval('every-60s')).toBe(60);
    expect(
      getDefaultTempC(
        { defaultBwTempC: DEFAULT_BW_TEMP_C, defaultColorTempC: DEFAULT_COLOR_TEMP_C },
        'color',
      ),
    ).toBe(DEFAULT_COLOR_TEMP_C);
  });
});
