import { useCallback, useEffect, useState } from 'react';
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
}

function useStoredResource<T>(
  load: () => Promise<T>,
  subscribe: (listener: () => void) => () => void,
  fallback: T,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: fallback,
    isLoading: true,
  });

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const next = await load();
      if (!active) {
        return;
      }

      setState({
        data: next,
        isLoading: false,
      });
    };

    refresh();
    const unsubscribe = subscribe(() => {
      void refresh();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [load, subscribe]);

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
