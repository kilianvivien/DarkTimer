import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { setOnlineStatus } from './utils';

class NotificationMock {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn(async () => NotificationMock.permission);
  static instances: Array<{ title: string; options?: NotificationOptions }> = [];

  constructor(title: string, options?: NotificationOptions) {
    NotificationMock.instances.push({ title, options });
  }
}

class AudioContextMock {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn(async () => {
    this.state = 'running';
  });

  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
}

const requestFullscreen = vi.fn(async function requestFullscreen(this: HTMLElement) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: this,
  });
  document.dispatchEvent(new Event('fullscreenchange'));
});

const exitFullscreen = vi.fn(async () => {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: null,
  });
  document.dispatchEvent(new Event('fullscreenchange'));
});

Object.defineProperty(window, 'Notification', {
  configurable: true,
  value: NotificationMock,
});

Object.defineProperty(window, 'AudioContext', {
  configurable: true,
  value: AudioContextMock,
});

Object.defineProperty(window, 'webkitAudioContext', {
  configurable: true,
  value: AudioContextMock,
});

Object.defineProperty(document, 'exitFullscreen', {
  configurable: true,
  writable: true,
  value: exitFullscreen,
});

Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
  configurable: true,
  writable: true,
  value: requestFullscreen,
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(navigator, 'vibrate', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

beforeEach(async () => {
  const storage = await import('../services/storage');
  const secretStorage = await import('../services/secretStorage');

  await storage.__resetStorageForTests();
  secretStorage.__resetApiKeyStateForTests();
  localStorage.clear();
  sessionStorage.clear();
  NotificationMock.permission = 'default';
  NotificationMock.requestPermission.mockClear();
  NotificationMock.instances = [];
  vi.clearAllMocks();
  setOnlineStatus(true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
