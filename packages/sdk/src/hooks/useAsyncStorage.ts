import { useState, useEffect, useCallback } from 'react';
import { createAsyncStorageService } from '../services/asyncStorageService';

/**
 * Async version of useStorage backed by IndexedDB.
 * Returns [value, setValue, isLoading].
 *
 * The value starts as `defaultValue` and is replaced when the IDB read completes.
 * `setValue` updates both React state and IndexedDB in parallel.
 */
export function useAsyncStorage<T>(
  appId: string,
  key: string,
  defaultValue: T,
): [T, (value: T) => void, boolean] {
  const [value, setLocalValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  const [asyncStorage] = useState(() => createAsyncStorageService(appId));

  useEffect(() => {
    let cancelled = false;
    asyncStorage.get<T>(key)
      .then((stored) => {
        if (!cancelled && stored !== null) {
          setLocalValue(stored);
        }
        if (!cancelled) setIsLoading(false);
      })
      .catch((err) => {
        console.warn('[useAsyncStorage] Failed to read key:', key, err);
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [asyncStorage, key]);

  const setValue = useCallback(
    (newValue: T) => {
      setLocalValue(newValue);
      asyncStorage.set(key, newValue).catch((err) => {
        console.warn('[useAsyncStorage] Failed to write key:', key, err);
      });
    },
    [asyncStorage, key],
  );

  return [value, setValue, isLoading];
}
