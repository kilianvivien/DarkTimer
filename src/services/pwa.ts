import { registerSW } from 'virtual:pwa-register';

export interface PwaUpdateState {
  needRefresh: boolean;
  isUpdating: boolean;
}

const listeners = new Set<() => void>();

let initialized = false;
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;
let state: PwaUpdateState = {
  needRefresh: false,
  isUpdating: false,
};

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<PwaUpdateState>): void {
  state = {
    ...state,
    ...patch,
  };
  emit();
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
