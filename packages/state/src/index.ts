export {
  useWindowsStore,
  useWindow,
  useFocusedWindowId,
  useAllWindows,
  onWindowOpen,
  onWindowClose,
  onWindowFocus,
  onWindowBlur,
  onWindowStateChange,
} from './stores/windows';

export {
  useAppRegistryStore,
  useApp,
  useAllApps,
  useRegistryStatus,
  useRegistryErrors,
  registryQueries,
  onAppRegistered,
  onAppUnregistered,
} from './stores/registry';

export type { RegistryError } from './stores/registry';

export { appManifestSchema, validateManifest, validateManifestSafe } from './schemas/manifest';

export {
  useShortcutsStore,
  useShortcut,
  useAllShortcuts,
} from './stores/shortcuts';

export {
  useNotificationsStore,
  useNotifications,
} from './stores/notifications';

export type { NotifyOptions } from './stores/notifications';

export { useContextMenuStore } from './stores/contextMenu';

export {
  useCommandRegistryStore,
  useCommand,
  useAllCommands,
  onCommandRegistered,
  onCommandUnregistered,
} from './stores/commands';

export {
  useMenuRegistryStore,
  useApplicationMenuItems,
  useContextMenuItems,
} from './stores/menus';

export {
  useWidgetRegistryStore,
  useWidget,
  useAllWidgets,
  useStatusBarWidgets,
} from './stores/widgets';

export {
  useSettingsStore,
  useSetting,
  useAllSettings,
  onSettingChanged,
} from './stores/settings';

export {
  usePermissionsStore,
  usePendingPrompt,
  ALL_PERMISSIONS,
} from './stores/permissions';

export type { PendingPrompt } from './stores/permissions';

export { processContributions, removeContributions } from './services/contributionProcessor';

export { activationService } from './services/activationService';
