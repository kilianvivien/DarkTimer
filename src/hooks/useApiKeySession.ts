import { useEffect, useState } from 'react';
import {
  getApiKeyStateSnapshot,
  initApiKeySession,
  subscribeToApiKeyState,
  type ApiKeyState,
} from '../services/secretStorage';

export function useApiKeySession(): ApiKeyState {
  const [state, setState] = useState<ApiKeyState>(() => getApiKeyStateSnapshot());

  useEffect(() => {
    let active = true;

    const syncState = () => {
      if (active) {
        setState(getApiKeyStateSnapshot());
      }
    };

    void initApiKeySession().then(syncState);
    const unsubscribe = subscribeToApiKeyState(syncState);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}
