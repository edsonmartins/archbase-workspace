import { useCallback } from 'react';
import { useSetting as useSettingFromState } from '@archbase/workspace-state';
import type { SettingValue } from '@archbase/workspace-types';
import { useWorkspace } from './useWorkspace';

/**
 * Read a setting value reactively.
 * Returns [value, setValue] tuple similar to useState.
 * Must be used within a <WorkspaceProvider>.
 */
export function useSettingValue<T extends SettingValue>(key: string): [T | undefined, (value: T) => void] {
  const sdk = useWorkspace();
  const entry = useSettingFromState(key);
  const value = (entry?.value ?? entry?.schema.default) as T | undefined;

  const setValue = useCallback(
    (newValue: T) => {
      sdk.settings.set(key, newValue);
    },
    [sdk, key],
  );

  return [value, setValue] as const;
}
