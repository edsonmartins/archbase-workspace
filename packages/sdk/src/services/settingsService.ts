import { useSettingsStore, onSettingChanged } from '@archbase/workspace-state';
import type { SettingValue } from '@archbase/workspace-types';

export function createSettingsService() {
  return {
    get<T extends SettingValue>(key: string): T | undefined {
      return useSettingsStore.getState().getValue(key) as T | undefined;
    },

    set(key: string, value: SettingValue) {
      useSettingsStore.getState().setValue(key, value);
    },

    onChange(key: string, handler: (value: SettingValue) => void): () => void {
      return onSettingChanged(key, handler);
    },
  };
}
