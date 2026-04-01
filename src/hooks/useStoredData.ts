import { useCallback, useEffect, useRef, useState } from 'react';
import type { Preset } from '../services/presetTypes';
import {
  initStorage,
  subscribeToStorage,
  getStoredPresets,
  getStoredSettings,
  saveStoredSettings,
} from '../services/storage';
import type { UserSettings } from '../services/userSettings';

interface AsyncState<T> {
  data: T;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

function useStoredResource<T>(
  load: () => Promise<T>,
  subscribe: (listener: () => void) => () => void,
  fallback: T,
): AsyncState<T> {
  const isMountedRef = useRef(false);
  const [state, setState] = useState<AsyncState<T>>({
    data: fallback,
    isLoading: true,
    refresh: async () => {},
  });

  const refresh = useCallback(async () => {
    const next = await load();
    if (!isMountedRef.current) {
      return;
    }

    setState((current) => ({
      ...current,
      data: next,
      isLoading: false,
    }));
  }, [load]);

  useEffect(() => {
    isMountedRef.current = true;

    void refresh();
    const unsubscribe = subscribe(() => {
      void refresh();
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [refresh, subscribe]);

  useEffect(() => {
    setState((current) => ({
      ...current,
      refresh,
    }));
  }, [refresh]);

  return state;
}

export function useStorageReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    void initStorage().then(() => {
      if (active) {
        setReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return ready;
}

export function useStoredSettings(fallback: UserSettings): AsyncState<UserSettings> {
  return useStoredResource(
    useCallback(() => getStoredSettings(), []),
    useCallback((listener: () => void) => subscribeToStorage('settings', listener), []),
    fallback,
  );
}

export function useStoredPresets(): AsyncState<Preset[]> {
  return useStoredResource(
    useCallback(() => getStoredPresets(), []),
    useCallback((listener: () => void) => subscribeToStorage('presets', listener), []),
    [],
  );
}

export function persistSettings(settings: UserSettings): Promise<UserSettings> {
  return saveStoredSettings(settings);
}
