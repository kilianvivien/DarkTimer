import { registerSW } from 'virtual:pwa-register';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallPlatform =
  | 'ios-safari'
  | 'android-chrome'
  | 'desktop-chrome'
  | 'desktop-safari'
  | 'unsupported';

export interface PwaUpdateState {
  needRefresh: boolean;
  isUpdating: boolean;
  isOnline: boolean;
  isStandalone: boolean;
  isInstallPromptAvailable: boolean;
  isInstallDismissed: boolean;
  installPlatform: InstallPlatform;
}

export interface InstallInstructions {
  title: string;
  body?: string;
  steps?: Array<{
    cue: string;
    detail: string;
    icon: 'ellipsis' | 'share' | 'plus' | 'toggle' | 'home' | 'menu' | 'download';
  }>;
}

const INSTALL_DISMISS_KEY = 'darktimer_pwa_install_dismissed';
const listeners = new Set<() => void>();

let initialized = false;
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let state: PwaUpdateState = {
  needRefresh: false,
  isUpdating: false,
  isOnline: true,
  isStandalone: false,
  isInstallPromptAvailable: false,
  isInstallDismissed: false,
  installPlatform: 'unsupported',
};

function emit(): void {
  listeners.forEach((listener) => listener());
}

function isTauriWindow(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    navigatorWithStandalone.standalone === true
  );
}

export function detectInstallPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  const ua = userAgent.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (ua.includes('macintosh') && maxTouchPoints > 1);
  const isAndroid = ua.includes('android');
  const isSafari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('crios') && !ua.includes('edg');
  const isChromium = ua.includes('chrome') || ua.includes('crios') || ua.includes('edg');
  const isMobile = isIOS || isAndroid;

  if (isIOS && isSafari) {
    return 'ios-safari';
  }

  if (isAndroid && isChromium) {
    return 'android-chrome';
  }

  if (!isMobile && isChromium) {
    return 'desktop-chrome';
  }

  if (!isMobile && isSafari) {
    return 'desktop-safari';
  }

  return 'unsupported';
}

function readInstallDismissed(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  return localStorage.getItem(INSTALL_DISMISS_KEY) === '1';
}

function writeInstallDismissed(value: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  if (value) {
    localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    return;
  }

  localStorage.removeItem(INSTALL_DISMISS_KEY);
}

function computeState(): Partial<PwaUpdateState> {
  if (typeof window === 'undefined' || isTauriWindow()) {
    return {
      isOnline: true,
      isStandalone: false,
      isInstallPromptAvailable: false,
      isInstallDismissed: true,
      installPlatform: 'unsupported',
    };
  }

  const installPlatform = detectInstallPlatform(
    navigator.userAgent,
    navigator.maxTouchPoints ?? 0,
  );
  const isStandalone = isStandaloneDisplay();
  const dismissed = readInstallDismissed();
  const isInstallPromptAvailable = deferredInstallPrompt !== null;
  const canShowInstructions =
    installPlatform !== 'unsupported' && installPlatform !== 'desktop-safari';

  return {
    isOnline: navigator.onLine,
    isStandalone,
    isInstallPromptAvailable,
    isInstallDismissed: dismissed || isStandalone || (!isInstallPromptAvailable && !canShowInstructions),
    installPlatform,
  };
}

function setState(patch: Partial<PwaUpdateState>): void {
  state = {
    ...state,
    ...patch,
  };
  emit();
}

function syncDerivedState(): void {
  setState(computeState());
}

export function initializePwaUpdates(): void {
  if (
    initialized ||
    typeof window === 'undefined' ||
    (window.location.protocol !== 'http:' && window.location.protocol !== 'https:')
  ) {
    return;
  }

  initialized = true;
  syncDerivedState();

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      setState({
        needRefresh: true,
        isUpdating: false,
      });
    },
    onRegisterError(error) {
      console.error('Failed to register DarkTimer service worker:', error);
    },
  });

  window.addEventListener('online', syncDerivedState);
  window.addEventListener('offline', syncDerivedState);
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    writeInstallDismissed(true);
    syncDerivedState();
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    writeInstallDismissed(false);
    syncDerivedState();
  });
}

export function subscribeToPwaUpdates(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getPwaUpdateSnapshot(): PwaUpdateState {
  return state;
}

export function dismissPwaUpdatePrompt(): void {
  if (!state.needRefresh) {
    return;
  }

  setState({ needRefresh: false });
}

export function dismissPwaInstallPrompt(): void {
  writeInstallDismissed(true);
  syncDerivedState();
}

export async function requestPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstallPrompt) {
    return 'unavailable';
  }

  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;

  await prompt.prompt();
  const result = await prompt.userChoice;

  if (result.outcome === 'accepted') {
    writeInstallDismissed(true);
  }

  syncDerivedState();
  return result.outcome;
}

export function getInstallInstructions(platform: InstallPlatform): InstallInstructions | null {
  switch (platform) {
    case 'ios-safari':
      return {
        title: 'Install on iPhone or iPad',
        steps: [
          {
            cue: 'More or Share',
            detail:
              'Tap the More button, then tap Share. If your Safari tabs are set to Bottom or Top, you can tap the Share button directly.',
            icon: 'share',
          },
          {
            cue: 'Add to Home Screen',
            detail:
              'Scroll down and tap Add to Home Screen. If you do not see it, scroll to the bottom, tap Edit Actions, and add it first.',
            icon: 'plus',
          },
          {
            cue: 'Open as Web App',
            detail: 'Turn on Open as Web App so DarkTimer launches like a standalone app.',
            icon: 'toggle',
          },
          {
            cue: 'Add',
            detail: 'Tap Add to place DarkTimer on your Home Screen.',
            icon: 'download',
          },
          {
            cue: 'Home Screen',
            detail: 'Launch DarkTimer from your Home Screen like a normal app.',
            icon: 'home',
          },
        ],
      };
    case 'android-chrome':
      return {
        title: 'Install on Android',
        steps: [
          {
            cue: 'Browser menu',
            detail: 'Open the browser menu in Chrome or Edge.',
            icon: 'menu',
          },
          {
            cue: 'Install app',
            detail: 'Tap Install app or Add to Home screen.',
            icon: 'download',
          },
          {
            cue: 'Confirm',
            detail: 'Accept the install prompt.',
            icon: 'plus',
          },
          {
            cue: 'Open app',
            detail: 'Launch DarkTimer from your app launcher or Home Screen.',
            icon: 'home',
          },
        ],
      };
    case 'desktop-chrome':
      return {
        title: 'Install on desktop',
        steps: [
          {
            cue: 'Address bar',
            detail: 'Look for the install icon in the address bar.',
            icon: 'download',
          },
          {
            cue: 'Browser menu',
            detail: 'If you do not see the install icon, open the browser menu.',
            icon: 'menu',
          },
          {
            cue: 'Install DarkTimer',
            detail: 'Choose Install DarkTimer.',
            icon: 'plus',
          },
          {
            cue: 'App window',
            detail: 'Confirm the prompt to launch DarkTimer in its own app window.',
            icon: 'home',
          },
        ],
      };
    default:
      return null;
  }
}

export async function applyPwaUpdate(): Promise<void> {
  if (!updateServiceWorker) {
    return;
  }

  setState({ isUpdating: true });

  try {
    await updateServiceWorker(true);
  } catch (error) {
    setState({ isUpdating: false });
    throw error;
  }
}

export function __resetPwaStateForTests(): void {
  deferredInstallPrompt = null;
  state = {
    needRefresh: false,
    isUpdating: false,
    isOnline: true,
    isStandalone: false,
    isInstallPromptAvailable: false,
    isInstallDismissed: false,
    installPlatform: 'unsupported',
  };
  writeInstallDismissed(false);
  listeners.clear();
  initialized = false;
  updateServiceWorker = undefined;
}
