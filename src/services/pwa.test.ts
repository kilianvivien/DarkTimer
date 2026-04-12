import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetPwaStateForTests,
  detectInstallPlatform,
  getInstallInstructions,
  isStandaloneDisplay,
} from './pwa';

describe('pwa service helpers', () => {
  beforeEach(() => {
    __resetPwaStateForTests();
  });

  it('detects install platforms from user agents', () => {
    expect(detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1', 5)).toBe('ios-safari');
    expect(detectInstallPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/123.0.0.0 Mobile Safari/537.36')).toBe('android-chrome');
    expect(detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36')).toBe('desktop-chrome');
  });

  it('returns platform install instructions only when the platform is supported', () => {
    expect(getInstallInstructions('ios-safari')).toMatchObject({
      title: 'Install on iPhone or iPad',
    });
    expect(getInstallInstructions('unsupported')).toBeNull();
    expect(getInstallInstructions('desktop-safari')).toBeNull();
  });

  it('detects standalone display mode from matchMedia', () => {
    window.matchMedia = ((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    expect(isStandaloneDisplay()).toBe(true);
  });
});
