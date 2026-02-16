import type { AppManifest } from '@archbase/workspace-types';
import { useCommandRegistryStore } from '../stores/commands';
import { useMenuRegistryStore } from '../stores/menus';
import { useWidgetRegistryStore } from '../stores/widgets';
import { useSettingsStore } from '../stores/settings';

/**
 * Process an app manifest's `contributes` section and register
 * commands, menus, widgets, and settings into their respective stores.
 */
export function processContributions(manifest: AppManifest): void {
  const { contributes, id: appId } = manifest;
  if (!contributes) return;

  if (contributes.commands?.length) {
    useCommandRegistryStore.getState().registerBatch(
      contributes.commands.map((cmd) => ({
        ...cmd,
        source: appId,
        enabled: true,
      })),
    );
  }

  if (contributes.menus) {
    useMenuRegistryStore.getState().registerMenuItems(appId, contributes.menus);
  }

  if (contributes.widgets?.length) {
    useWidgetRegistryStore.getState().registerBatch(
      contributes.widgets.map((w, i) => ({
        ...w,
        source: appId,
        visible: true,
        order: i,
      })),
    );
  }

  if (contributes.settings?.length) {
    useSettingsStore.getState().registerSettings(appId, contributes.settings);
  }
}

/**
 * Remove all contributions from an app across all registries.
 */
export function removeContributions(appId: string): void {
  useCommandRegistryStore.getState().unregisterBySource(appId);
  useMenuRegistryStore.getState().unregisterBySource(appId);
  useWidgetRegistryStore.getState().unregisterBySource(appId);
  useSettingsStore.getState().unregisterBySource(appId);
}
