import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  getDefaultTemperatureForMode,
  normalizeAIProvider,
  normalizeApiKeyPersistenceMode,
  normalizeAppTheme,
  normalizeSettings,
} from './userSettings';

describe('userSettings helpers', () => {
  it('normalizes settings and preserves supported values', () => {
    const settings = normalizeSettings({
      defaultStopBath: 45,
      aiProvider: 'mistral',
      apiKeyPersistenceMode: 'encrypted',
      phaseCountdown: 5,
      yoloRun: true,
      theme: 'safelight',
      cueVolume: 0.8,
      agitationFlashMode: 'border',
      agitationVibrationEnabled: true,
    });

    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      defaultStopBath: 45,
      aiProvider: 'mistral',
      apiKeyPersistenceMode: 'encrypted',
      phaseCountdown: 5,
      yoloRun: true,
      theme: 'safelight',
      cueVolume: 0.8,
      agitationFlashMode: 'border',
      agitationVibrationEnabled: true,
    });
  });

  it('falls back for unsupported provider and persistence values', () => {
    expect(normalizeAIProvider('other')).toBe('gemini');
    expect(normalizeApiKeyPersistenceMode('other')).toBe('session');
    expect(normalizeAppTheme('other')).toBe('dark');
    expect(
      normalizeSettings({
        phaseCountdown: 123,
        yoloRun: 'wrong',
        theme: 'wrong',
        cueVolume: 'wrong',
        agitationFlashMode: 'wrong',
        agitationVibrationEnabled: 'wrong',
      }),
    ).toEqual(DEFAULT_SETTINGS);
  });

  it('migrates the legacy agitation flash boolean', () => {
    expect(normalizeSettings({ agitationFlashEnabled: false }).agitationFlashMode).toBe('off');
    expect(normalizeSettings({ agitationFlashEnabled: true }).agitationFlashMode).toBe('full');
    expect(
      normalizeSettings({ agitationFlashEnabled: false, agitationFlashMode: 'border' })
        .agitationFlashMode,
    ).toBe('border');
  });

  it('clamps cue volume into the 0-1 range', () => {
    expect(normalizeSettings({ cueVolume: 1.8 }).cueVolume).toBe(1);
    expect(normalizeSettings({ cueVolume: -2 }).cueVolume).toBe(0);
  });

  it('returns mode-specific default temperatures', () => {
    expect(getDefaultTemperatureForMode('bw')).toBe(DEFAULT_SETTINGS.defaultBwTempC);
    expect(getDefaultTemperatureForMode('color')).toBe(DEFAULT_SETTINGS.defaultColorTempC);
  });
});
