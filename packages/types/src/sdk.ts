import type { CollaborationSDK, CommandHandler, ContextMenuItem, Permission, PermissionGrant, SettingValue, WindowState } from './index';

/** SDK instance scoped to a specific app and window */
export interface WorkspaceSDK {
  readonly appId: string;
  readonly windowId: string;

  /** Window management for the current app */
  readonly windows: {
    open(opts: { title: string; width?: number; height?: number; props?: Record<string, unknown> }): string;
    close(windowId?: string): void;
    minimize(windowId?: string): void;
    maximize(windowId?: string): void;
    restore(windowId?: string): void;
    setTitle(title: string, windowId?: string): void;
    getAll(): Array<{ id: string; title: string; state: WindowState }>;
  };

  /** Command registration and execution */
  readonly commands: {
    register(commandId: string, handler: CommandHandler): () => void;
    execute(commandId: string, ...args: unknown[]): Promise<void>;
  };

  /** Notification service */
  readonly notifications: {
    info(title: string, message?: string): string;
    success(title: string, message?: string): string;
    warning(title: string, message?: string): string;
    error(title: string, message?: string): string;
    dismiss(id: string): void;
  };

  /** Settings service */
  readonly settings: {
    get<T extends SettingValue>(key: string): T | undefined;
    set(key: string, value: SettingValue): void;
    onChange(key: string, handler: (value: SettingValue) => void): () => void;
  };

  /** Scoped storage (localStorage with app namespace) */
  readonly storage: {
    get<T>(key: string): T | null;
    set(key: string, value: unknown): void;
    remove(key: string): void;
    clear(): void;
    keys(): string[];
  };

  /** Context menu */
  readonly contextMenu: {
    show(position: { x: number; y: number }, items: ContextMenuItem[]): void;
  };

  /** Permission management for the current app */
  readonly permissions: {
    check(permission: Permission): PermissionGrant;
    request(permission: Permission): Promise<boolean>;
    list(): Array<{ permission: Permission; grant: PermissionGrant }>;
  };

  /** Real-time collaboration */
  readonly collaboration: CollaborationSDK;
}
