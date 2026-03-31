import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  getDefaultTemperatureForMode,
  normalizeAIProvider,
  normalizeApiKeyPersistenceMode,
  normalizeSettings,
} from './userSettings';

describe('userSettings helpers', () => {
  it('normalizes settings and preserves supported values', () => {
    const settings = normalizeSettings({
      defaultStopBath: 45,
      aiProvider: 'mistral',
      apiKeyPersistenceMode: 'encrypted',
      phaseCountdown: 5,
      agitationFlashEnabled: false,
      agitationVibrationEnabled: true,
    });

    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      defaultStopBath: 45,
      aiProvider: 'mistral',
      apiKeyPersistenceMode: 'encrypted',
      phaseCountdown: 5,
      agitationFlashEnabled: false,
      agitationVibrationEnabled: true,
    });
  });

  it('falls back for unsupported provider and persistence values', () => {
    expect(normalizeAIProvider('other')).toBe('gemini');
    expect(normalizeApiKeyPersistenceMode('other')).toBe('session');
    expect(
      normalizeSettings({
        phaseCountdown: 123,
        agitationFlashEnabled: 'wrong',
        agitationVibrationEnabled: 'wrong',
      }),
    ).toEqual(DEFAULT_SETTINGS);
  });

  it('returns mode-specific default temperatures', () => {
    expect(getDefaultTemperatureForMode('bw')).toBe(DEFAULT_SETTINGS.defaultBwTempC);
    expect(getDefaultTemperatureForMode('color')).toBe(DEFAULT_SETTINGS.defaultColorTempC);
  });
});
