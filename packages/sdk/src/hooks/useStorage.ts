import { useState, useCallback } from 'react';
import { useWorkspace } from './useWorkspace';

/**
 * Read/write scoped storage reactively.
 * Returns [value, setValue] tuple similar to useState.
 * Must be used within a <WorkspaceProvider>.
 */
export function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const sdk = useWorkspace();

  const [value, setLocalValue] = useState<T>(() => {
    const stored = sdk.storage.get<T>(key);
    return stored ?? defaultValue;
  });

  const setValue = useCallback(
    (newValue: T) => {
      sdk.storage.set(key, newValue);
      setLocalValue(newValue);
    },
    [sdk, key],
  );

  return [value, setValue];
}
