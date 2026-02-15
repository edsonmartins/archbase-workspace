// Re-export domain types
export * from './shortcuts';
export * from './notifications';
export * from './contextMenu';
export * from './snap';

// ============================================================
// Window Types (RFC-001: Window Service API)
// ============================================================

export type WindowState = 'normal' | 'minimized' | 'maximized';

export type TileLayout = 'horizontal' | 'vertical' | 'grid';

/** Callback unsubscribe function */
export type Unsubscribe = () => void;

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

export interface WindowFlags {
  resizable: boolean;
  maximizable: boolean;
  minimizable: boolean;
  closable: boolean;
}

export interface WindowMetadata {
  icon?: string;
  className?: string;
  createdAt: number;
  focusedAt: number;
}

export interface WorkspaceWindow {
  id: string;
  appId: string;
  title: string;
  position: WindowPosition;
  size: WindowSize;
  constraints: WindowConstraints;
  zIndex: number;
  state: WindowState;
  flags: WindowFlags;
  props: Record<string, unknown>;
  metadata: WindowMetadata;
  previousBounds?: {
    position: WindowPosition;
    size: WindowSize;
    previousState?: WindowState;
  };
}

export interface WindowOptions {
  appId: string;
  title: string;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  x?: number;
  y?: number;
  resizable?: boolean;
  maximizable?: boolean;
  minimizable?: boolean;
  closable?: boolean;
  state?: WindowState;
  props?: Record<string, unknown>;
  icon?: string;
  className?: string;
}

export interface WindowService {
  // CRUD
  open(options: WindowOptions): string;
  close(id: string): void;
  closeByAppId(appId: string): void;
  closeAll(): void;

  // State management
  minimize(id: string): void;
  maximize(id: string, viewportWidth: number, viewportHeight: number, taskbarHeight?: number): void;
  restore(id: string): void;
  toggleMaximize(id: string, viewportWidth: number, viewportHeight: number, taskbarHeight?: number): void;

  // Focus
  focus(id: string): void;
  focusNext(): void;
  focusPrevious(): void;

  // Position & Size
  setPosition(id: string, position: WindowPosition): void;
  setSize(id: string, size: WindowSize): void;
  setBounds(id: string, bounds: WindowBounds): void;
  center(id: string, viewportWidth: number, viewportHeight: number): void;

  // Queries
  get(id: string): WorkspaceWindow | undefined;
  getByAppId(appId: string): WorkspaceWindow[];
  getAll(): WorkspaceWindow[];
  getFocused(): WorkspaceWindow | undefined;
  exists(id: string): boolean;

  // Events
  onOpen(handler: (window: WorkspaceWindow) => void): Unsubscribe;
  onClose(handler: (id: string) => void): Unsubscribe;
  onFocus(id: string, handler: () => void): Unsubscribe;
  onBlur(id: string, handler: () => void): Unsubscribe;
  onStateChange(id: string, handler: (state: WindowState) => void): Unsubscribe;

  // Bulk operations
  minimizeAll(): void;
  cascadeWindows(viewportWidth: number, viewportHeight: number, taskbarHeight?: number): void;
  tileWindows(layout: TileLayout, viewportWidth: number, viewportHeight: number, taskbarHeight?: number): void;
}

// ============================================================
// App Manifest Types (RFC-002: App Manifest Structure)
// ============================================================

export interface WindowConfig {
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  maximizable?: boolean;
  minimizable?: boolean;
  closable?: boolean;
  alwaysOnTop?: boolean;
}

export type Permission =
  | 'notifications'
  | 'storage'
  | 'clipboard.read'
  | 'clipboard.write'
  | 'filesystem.read'
  | 'filesystem.write'
  | 'network'
  | 'camera'
  | 'microphone';

export interface Command {
  id: string;
  title: string;
  icon?: string;
  keybinding?: string;
  category?: string;
}

export interface MenuItem {
  command: string;
  group?: string;
  when?: string;
}

export interface MenuContributions {
  application?: MenuItem[];
  context?: MenuItem[];
  window?: MenuItem[];
}

export interface Widget {
  id: string;
  title: string;
  component: string;
  defaultLocation: 'statusBar' | 'sidebar' | 'panel';
}

export type SettingValue = string | number | boolean;

export interface Setting<T extends SettingValue = SettingValue> {
  key: string;
  type: T extends string ? 'string' : T extends number ? 'number' : 'boolean';
  default: T;
  description: string;
}

export interface ContributionPoints {
  commands?: Command[];
  menus?: MenuContributions;
  widgets?: Widget[];
  settings?: Setting[];
}

export type ActivationEvent =
  | 'onDesktopReady'
  | `onCommand:${string}`
  | `onFileType:${string}`
  | `onShortcut:${string}`
  | `onSchedule:${string}`;

export interface LifecycleConfig {
  singleton?: boolean;
  background?: boolean;
  preload?: boolean;
  autoStart?: boolean;
}

export interface PlatformConfig {
  os?: ('windows' | 'macos' | 'linux')[];
  browser?: ('chrome' | 'edge' | 'firefox' | 'safari')[];
  minVersion?: string;
}

export interface ManifestAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface ManifestRepository {
  type: 'git' | 'svn';
  url: string;
}

export type ManifestSource = 'local' | 'remote' | 'registry';

export interface AppManifest {
  id: string;
  name: string;
  version: string;
  entrypoint: string;
  remoteEntry: string;
  displayName?: string;
  description?: string;
  author?: ManifestAuthor;
  license?: string;
  homepage?: string;
  repository?: ManifestRepository;
  keywords?: string[];
  icon?: string;
  screenshots?: string[];
  window?: WindowConfig;
  shared?: Record<string, string>;
  exposes?: Record<string, string>;
  permissions?: Permission[];
  contributes?: ContributionPoints;
  activationEvents?: ActivationEvent[];
  lifecycle?: LifecycleConfig;
  dependencies?: Record<string, string>;
  platform?: PlatformConfig;
  source?: ManifestSource;
}
