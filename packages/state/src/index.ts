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
