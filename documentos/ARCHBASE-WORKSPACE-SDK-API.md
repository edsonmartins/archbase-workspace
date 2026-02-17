# Archbase Workspace SDK -- API Reference

> **Package:** `@archbase/workspace-sdk`
> **Version:** 0.1.0
> **Last updated:** 2026-02-16

---

## Table of Contents

1. [Overview](#1-overview)
2. [Installation & Setup](#2-installation--setup)
3. [Core Functions](#3-core-functions)
   - [createWorkspaceSDK](#createworkspacesdkappid-windowid)
   - [createSecureSDK](#createsecuresdkappid-windowid-manifest)
4. [React Hooks](#4-react-hooks)
   - [useWorkspace](#useworkspace)
   - [useWindowContext](#usewindowcontext)
   - [useCommand](#usecommandcommandid-handler)
   - [useSettingValue](#usesettingvaluekey)
   - [useStorage](#usestoragekey-defaultvalue)
   - [useTheme](#usetheme)
   - [useAsyncStorage](#useasyncstorageappid-key-defaultvalue)
   - [useCollaboration](#usecollaboration)
5. [SDK Services](#5-sdk-services)
   - [sdk.windows](#sdkwindows)
   - [sdk.commands](#sdkcommands)
   - [sdk.notifications](#sdknotifications)
   - [sdk.settings](#sdksettings)
   - [sdk.storage](#sdkstorage)
   - [sdk.contextMenu](#sdkcontextmenu)
   - [sdk.permissions](#sdkpermissions)
   - [sdk.collaboration](#sdkcollaboration)
6. [Bridge APIs](#6-bridge-apis)
   - [createHostBridge](#createhostbridgeoptions)
   - [createIframeBridgeSDK](#createiframebridgesdkappid-windowid-options)
   - [isBridgeMessage](#isbridgemessagedata)
7. [Types Reference](#7-types-reference)
8. [Examples](#8-examples)

---

## 1. Overview

The Archbase Workspace SDK provides a unified API for remote applications to interact with the host workspace shell. It follows a **scoped, permission-aware** design:

- Every SDK instance is scoped to a specific `appId` and `windowId`.
- Services such as notifications and storage can be gated by a permission system.
- The SDK supports two runtime modes:
  - **In-process** (Module Federation): Direct function calls via `createWorkspaceSDK` or `createSecureSDK`.
  - **Sandboxed iframe**: Asynchronous communication via the PostMessage Bridge (`createIframeBridgeSDK`).

### Architecture

```
+---------------------------+       postMessage        +-------------------+
|  Host Shell (core)        |  <------------------->   |  Sandboxed iframe |
|                           |                          |                   |
|  createWorkspaceSDK()     |                          |  createIframe-    |
|  createSecureSDK()        |     createHostBridge()   |  BridgeSDK()      |
|  WorkspaceProvider        |                          |                   |
+---------------------------+                          +-------------------+

+---------------------------+
|  MF Remote App (in-proc)  |
|                           |
|  <WorkspaceProvider>      |
|    useWorkspace()         |
|    useWindowContext()     |
|    useCommand()           |
|    useSettingValue()      |
|    useStorage()           |
+---------------------------+
```

---

## 2. Installation & Setup

### Install the SDK package

```bash
pnpm add @archbase/workspace-sdk
```

The SDK has peer dependencies on the types and state packages:

```bash
pnpm add @archbase/workspace-types @archbase/workspace-state
```

### Basic setup in a remote app

Wrap your remote app root with `WorkspaceProvider` and pass the SDK instance that the host provides:

```tsx
import { WorkspaceProvider } from '@archbase/workspace-sdk';
import type { WorkspaceSDK } from '@archbase/workspace-types';

interface AppProps {
  sdk: WorkspaceSDK;
}

export default function MyApp({ sdk }: AppProps) {
  return (
    <WorkspaceProvider value={sdk}>
      <MainContent />
    </WorkspaceProvider>
  );
}
```

### Host-side setup

On the host shell, create the SDK before rendering the remote app:

```tsx
import { createSecureSDK } from '@archbase/workspace-sdk';

// When mounting a remote app:
const sdk = createSecureSDK(manifest.id, windowId, manifest);
```

---

## 3. Core Functions

### `createWorkspaceSDK(appId, windowId)`

Creates a base `WorkspaceSDK` instance scoped to the given app and window. This is the main factory function used by the host to provide SDK instances to remote apps.

**Signature:**

```typescript
function createWorkspaceSDK(appId: string, windowId: string): WorkspaceSDK;
```

**Parameters:**

| Parameter  | Type     | Description                         |
|------------|----------|-------------------------------------|
| `appId`    | `string` | Unique identifier for the application. |
| `windowId` | `string` | Unique identifier for the window instance. |

**Returns:** `WorkspaceSDK` -- A fully populated SDK instance with all service namespaces.

**Behavior notes:**

- The `permissions` service in the base SDK is a **fail-closed stub**: `check()` always returns `'denied'`, `request()` always resolves to `false`, and `list()` returns an empty array.
- All other services (windows, commands, notifications, settings, storage, contextMenu) are fully functional.
- Use `createSecureSDK` instead if you need proper permission enforcement.

**Example:**

```typescript
import { createWorkspaceSDK } from '@archbase/workspace-sdk';

const sdk = createWorkspaceSDK('my-app', 'win-abc-123');
sdk.notifications.info('Hello', 'App is ready');
```

---

### `createSecureSDK(appId, windowId, manifest)`

Creates a permission-aware SDK instance. Wraps the base SDK with permission checks on services that require authorization.

**Signature:**

```typescript
function createSecureSDK(
  appId: string,
  windowId: string,
  manifest: AppManifest,
): WorkspaceSDK;
```

**Parameters:**

| Parameter  | Type          | Description                                    |
|------------|---------------|------------------------------------------------|
| `appId`    | `string`      | Unique identifier for the application.         |
| `windowId` | `string`      | Unique identifier for the window instance.     |
| `manifest` | `AppManifest` | The app manifest declaring permissions and metadata. |

**Returns:** `WorkspaceSDK` -- A permission-enforced SDK instance.

**Currently enforced permissions:**

| Permission       | Gated services        |
|------------------|-----------------------|
| `'notifications'` | `sdk.notifications.*` |
| `'storage'`       | `sdk.storage.*`       |

**Pass-through services** (non-destructive and already scoped per-app):
- `sdk.windows`
- `sdk.commands`
- `sdk.settings`
- `sdk.contextMenu`

**Permission enforcement logic:**

1. If the permission grant is `'granted'` -- the call proceeds.
2. If the permission grant is `'denied'` -- the call is silently blocked and returns a safe default (`''` for notification IDs, `null` for storage gets, `[]` for storage keys).
3. If the permission grant is `'prompt'`:
   - If the permission is **declared** in the manifest -- the app must call `sdk.permissions.request()` first.
   - If the permission is **not declared** in the manifest -- the call is denied without persisting (so adding it to the manifest later will re-prompt).

**Example:**

```typescript
import { createSecureSDK } from '@archbase/workspace-sdk';
import type { AppManifest } from '@archbase/workspace-types';

const manifest: AppManifest = {
  id: 'notes',
  name: 'Notes App',
  version: '1.0.0',
  entrypoint: './App',
  remoteEntry: 'http://localhost:3003/remoteEntry.js',
  permissions: ['notifications', 'storage'],
};

const sdk = createSecureSDK('notes', 'win-xyz', manifest);

// The app must request permissions before using gated services:
const granted = await sdk.permissions.request('notifications');
if (granted) {
  sdk.notifications.success('Saved', 'Your note has been saved.');
}
```

---

## 4. React Hooks

All hooks must be used inside a `<WorkspaceProvider>` component. They throw an error if used outside the provider context.

### `useWorkspace()`

Returns the full `WorkspaceSDK` instance from context.

**Signature:**

```typescript
function useWorkspace(): WorkspaceSDK;
```

**Returns:** `WorkspaceSDK` -- The SDK instance provided by the nearest `WorkspaceProvider`.

**Throws:** `Error` if used outside a `<WorkspaceProvider>`.

**Example:**

```tsx
import { useWorkspace } from '@archbase/workspace-sdk';

function StatusBar() {
  const sdk = useWorkspace();

  const handleSave = () => {
    sdk.storage.set('lastSaved', Date.now());
    sdk.notifications.success('Saved', 'Data saved successfully.');
  };

  return <button onClick={handleSave}>Save</button>;
}
```

---

### `useWindowContext()`

Returns window-specific utilities for the current window, including focus state. This is a convenience hook that wraps common `sdk.windows` operations.

**Signature:**

```typescript
function useWindowContext(): {
  windowId: string;
  close: () => void;
  minimize: () => void;
  maximize: () => void;
  restore: () => void;
  setTitle: (title: string) => void;
  isFocused: boolean;
};
```

**Returns:** An object with:

| Property    | Type                       | Description                                |
|-------------|----------------------------|--------------------------------------------|
| `windowId`  | `string`                   | The current window ID.                     |
| `close`     | `() => void`               | Closes the current window.                 |
| `minimize`  | `() => void`               | Minimizes the current window.              |
| `maximize`  | `() => void`               | Maximizes the current window.              |
| `restore`   | `() => void`               | Restores the current window from minimized/maximized state. |
| `setTitle`  | `(title: string) => void`  | Updates the window title.                  |
| `isFocused` | `boolean`                  | Whether this window currently has focus.   |

**Reactive behavior:** The `isFocused` property updates reactively when focus changes in the workspace.

**Example:**

```tsx
import { useWindowContext } from '@archbase/workspace-sdk';

function TitleBar() {
  const { close, minimize, maximize, isFocused, setTitle } = useWindowContext();

  return (
    <div className={isFocused ? 'title-bar focused' : 'title-bar'}>
      <button onClick={minimize}>_</button>
      <button onClick={maximize}>[]</button>
      <button onClick={close}>X</button>
    </div>
  );
}
```

---

### `useCommand(commandId, handler)`

Registers a command handler that automatically unregisters on unmount. The handler reference is kept stable -- you can pass inline closures without causing re-registrations.

**Signature:**

```typescript
function useCommand(commandId: string, handler: CommandHandler): void;
```

**Parameters:**

| Parameter   | Type             | Description                              |
|-------------|------------------|------------------------------------------|
| `commandId` | `string`         | The unique ID of the command to register. |
| `handler`   | `CommandHandler` | The function to invoke when the command is executed. |

**Type:** `CommandHandler = (...args: unknown[]) => void | Promise<void>`

**Behavior:**

- Registers the handler when the component mounts.
- Automatically unregisters the handler when the component unmounts.
- Uses a ref internally so the handler identity can change without causing re-registration.

**Example:**

```tsx
import { useCommand } from '@archbase/workspace-sdk';

function Editor() {
  const [content, setContent] = useState('');

  useCommand('editor.save', async () => {
    await saveToBackend(content);
  });

  useCommand('editor.clear', () => {
    setContent('');
  });

  return <textarea value={content} onChange={(e) => setContent(e.target.value)} />;
}
```

---

### `useSettingValue(key)`

Reads a setting value reactively and returns a `[value, setValue]` tuple, similar to `useState`.

**Signature:**

```typescript
function useSettingValue<T extends SettingValue>(
  key: string,
): [T | undefined, (value: T) => void];
```

**Type parameter:** `T extends SettingValue` where `SettingValue = string | number | boolean`.

**Parameters:**

| Parameter | Type     | Description                   |
|-----------|----------|-------------------------------|
| `key`     | `string` | The setting key to observe.   |

**Returns:** A tuple of `[value, setValue]`:

| Index | Type                   | Description                                         |
|-------|------------------------|-----------------------------------------------------|
| `[0]` | `T \| undefined`       | The current setting value, or the schema default, or `undefined`. |
| `[1]` | `(value: T) => void`   | A setter function to update the setting value.      |

**Reactive behavior:** Re-renders the component when the setting value changes in the global settings store.

**Example:**

```tsx
import { useSettingValue } from '@archbase/workspace-sdk';

function ThemeToggle() {
  const [theme, setTheme] = useSettingValue<string>('appearance.theme');

  return (
    <select value={theme ?? 'dark'} onChange={(e) => setTheme(e.target.value)}>
      <option value="dark">Dark</option>
      <option value="light">Light</option>
    </select>
  );
}
```

---

### `useStorage(key, defaultValue)`

Reads and writes scoped storage reactively. Returns a `[value, setValue]` tuple similar to `useState`.

**Signature:**

```typescript
function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void];
```

**Parameters:**

| Parameter      | Type     | Description                              |
|----------------|----------|------------------------------------------|
| `key`          | `string` | The storage key (namespaced to the app). |
| `defaultValue` | `T`      | Default value if nothing is stored.      |

**Returns:** A tuple of `[value, setValue]`:

| Index | Type                 | Description                                      |
|-------|----------------------|--------------------------------------------------|
| `[0]` | `T`                  | The stored value, or `defaultValue` if not found. |
| `[1]` | `(value: T) => void` | A setter that writes to both local state and storage. |

**Behavior:**

- On mount, reads the stored value from `sdk.storage.get(key)`. If none exists, uses `defaultValue`.
- The setter writes to both the local React state (for immediate re-render) and the SDK storage service (for persistence).

**Example:**

```tsx
import { useStorage } from '@archbase/workspace-sdk';

function Counter() {
  const [count, setCount] = useStorage<number>('counter', 0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
```

---

### `useTheme()`

Returns current theme information and a setter for changing the theme.

```tsx
const { theme, setTheme, isDark } = useTheme();
```

| Property   | Type                                    | Description                              |
|------------|-----------------------------------------|------------------------------------------|
| `theme`    | `'dark' \| 'light' \| 'auto'`          | Current theme mode                       |
| `setTheme` | `(theme: 'dark' \| 'light' \| 'auto') => void` | Change theme                    |
| `isDark`   | `boolean`                               | Whether current effective theme is dark  |

**Reactive behavior:** Re-renders the component when the theme changes. When `theme` is `'auto'`, the `isDark` property reflects the operating system's `prefers-color-scheme` media query.

**Example:**

```tsx
import { useTheme } from '@archbase/workspace-sdk';

function ThemeSwitch() {
  const { theme, setTheme, isDark } = useTheme();

  return (
    <button onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      Switch to {isDark ? 'Light' : 'Dark'} Mode
    </button>
  );
}
```

---

### `useAsyncStorage(appId, key, defaultValue)`

Persistent per-app storage backed by IndexedDB. Returns a tuple similar to `useState` with an additional loading indicator.

```tsx
const [value, setValue, isLoading] = useAsyncStorage('my-app', 'settings', defaultSettings);
```

| Return      | Type                     | Description                              |
|-------------|--------------------------|------------------------------------------|
| `value`     | `T`                      | Current stored value (or default)        |
| `setValue`  | `(value: T) => Promise<void>` | Persist a new value                |
| `isLoading` | `boolean`               | Whether the initial load is in progress  |

**Behavior:**

- On mount, asynchronously loads the stored value from IndexedDB. While loading, `value` equals `defaultValue` and `isLoading` is `true`.
- Once loaded, `value` updates to the stored value and `isLoading` becomes `false`.
- Calling `setValue` writes to both local state (immediate re-render) and IndexedDB (persistent).

**Example:**

```tsx
import { useAsyncStorage } from '@archbase/workspace-sdk';

function UserPreferences() {
  const [prefs, setPrefs, isLoading] = useAsyncStorage('my-app', 'prefs', { fontSize: 14 });

  if (isLoading) return <p>Loading preferences...</p>;

  return (
    <div>
      <label>Font Size: {prefs.fontSize}</label>
      <button onClick={() => setPrefs({ ...prefs, fontSize: prefs.fontSize + 1 })}>
        Increase
      </button>
    </div>
  );
}
```

---

### `useCollaboration()`

Real-time collaboration state hook. Returns the current collaboration session state from the collaboration store.

```tsx
const { isConnected, roomId, currentUser, users, cursors, sharedWindows, followingUserId } = useCollaboration();
```

| Property          | Type                        | Description                          |
|-------------------|-----------------------------|--------------------------------------|
| `isConnected`     | `boolean`                   | Whether a collaboration session is active |
| `roomId`          | `string \| null`            | Current room ID                      |
| `currentUser`     | `CollaborationUser \| null` | Local user info                      |
| `users`           | `UserPresence[]`            | Online users                         |
| `cursors`         | `RemoteCursor[]`            | Remote cursor positions              |
| `sharedWindows`   | `SharedWindowInfo[]`        | Windows being shared                 |
| `followingUserId` | `string \| null`            | User being followed                  |

**Reactive behavior:** Re-renders the component when any collaboration state changes (users joining/leaving, cursor movements, shared windows changing, etc.).

**Example:**

```tsx
import { useCollaboration } from '@archbase/workspace-sdk';

function CollaborationStatus() {
  const { isConnected, users, roomId } = useCollaboration();

  if (!isConnected) return <span>Offline</span>;

  return (
    <span>
      Room: {roomId} — {users.length} user(s) online
    </span>
  );
}
```

---

## 5. SDK Services

The `WorkspaceSDK` interface exposes eight service namespaces. Each is documented below with its full method signatures and behavior.

### `sdk.windows`

Window management scoped to the current app.

#### `sdk.windows.open(opts)`

Opens a new window for the current app.

```typescript
open(opts: {
  title: string;
  width?: number;
  height?: number;
  props?: Record<string, unknown>;
}): string;
```

| Parameter    | Type                         | Default   | Description                                |
|--------------|------------------------------|-----------|--------------------------------------------|
| `opts.title` | `string`                     | --        | Window title displayed in the title bar.   |
| `opts.width` | `number` (optional)          | From manifest or `400` | Window width in pixels.    |
| `opts.height`| `number` (optional)          | From manifest or `300` | Window height in pixels.   |
| `opts.props` | `Record<string, unknown>` (optional) | `{}` | Custom properties passed to the app component. |

**Returns:** `string` -- The newly created window ID.

#### `sdk.windows.close(windowId?)`

Closes a window.

```typescript
close(windowId?: string): void;
```

| Parameter  | Type               | Default            | Description                       |
|------------|--------------------|--------------------|-----------------------------------|
| `windowId` | `string` (optional) | Current `windowId` | The ID of the window to close.    |

#### `sdk.windows.minimize(windowId?)`

Minimizes a window to the taskbar.

```typescript
minimize(windowId?: string): void;
```

| Parameter  | Type               | Default            | Description                        |
|------------|--------------------|--------------------|-------------------------------------|
| `windowId` | `string` (optional) | Current `windowId` | The ID of the window to minimize.  |

#### `sdk.windows.maximize(windowId?)`

Maximizes a window to fill the viewport. Uses `globalThis.innerWidth` and `globalThis.innerHeight` for viewport dimensions.

```typescript
maximize(windowId?: string): void;
```

| Parameter  | Type               | Default            | Description                        |
|------------|--------------------|--------------------|-------------------------------------|
| `windowId` | `string` (optional) | Current `windowId` | The ID of the window to maximize.  |

#### `sdk.windows.restore(windowId?)`

Restores a window from minimized or maximized state to its previous bounds.

```typescript
restore(windowId?: string): void;
```

| Parameter  | Type               | Default            | Description                        |
|------------|--------------------|--------------------|-------------------------------------|
| `windowId` | `string` (optional) | Current `windowId` | The ID of the window to restore.   |

#### `sdk.windows.setTitle(title, windowId?)`

Updates the title of a window.

```typescript
setTitle(title: string, windowId?: string): void;
```

| Parameter  | Type               | Default            | Description                       |
|------------|--------------------|--------------------|-----------------------------------|
| `title`    | `string`           | --                 | The new window title.             |
| `windowId` | `string` (optional) | Current `windowId` | The ID of the window to update.   |

#### `sdk.windows.getAll()`

Returns all windows belonging to the current app.

```typescript
getAll(): Array<{ id: string; title: string; state: WindowState }>;
```

**Returns:** An array of window summaries with `id`, `title`, and `state` (`'normal'`, `'minimized'`, or `'maximized'`).

---

### `sdk.commands`

Command registration and execution system.

#### `sdk.commands.register(commandId, handler)`

Registers a handler for a command. If the command already exists (e.g., declared in the manifest), the handler is attached to it. If it does not exist, a new command entry is created with the `commandId` as both the ID and title.

```typescript
register(commandId: string, handler: CommandHandler): () => void;
```

| Parameter   | Type             | Description                                      |
|-------------|------------------|--------------------------------------------------|
| `commandId` | `string`         | Unique command identifier (e.g., `'editor.save'`). |
| `handler`   | `CommandHandler` | Function invoked when the command is executed.   |

**Returns:** `() => void` -- An unsubscribe function that removes the handler. It does not unregister the command itself (since it may have been declared in the manifest).

#### `sdk.commands.execute(commandId, ...args)`

Executes a registered command by its ID.

```typescript
execute(commandId: string, ...args: unknown[]): Promise<void>;
```

| Parameter   | Type         | Description                               |
|-------------|--------------|-------------------------------------------|
| `commandId` | `string`     | The command ID to execute.                |
| `...args`   | `unknown[]`  | Arguments to pass to the command handler. |

**Returns:** `Promise<void>` -- Resolves when the handler completes.

**Throws:** If the command is not found or has no registered handler.

---

### `sdk.notifications`

Notification service for displaying toast messages.

All notification methods return a unique notification ID that can be used to dismiss the notification programmatically.

#### `sdk.notifications.info(title, message?)`

```typescript
info(title: string, message?: string): string;
```

Displays an informational notification. Returns the notification ID.

#### `sdk.notifications.success(title, message?)`

```typescript
success(title: string, message?: string): string;
```

Displays a success notification. Returns the notification ID.

#### `sdk.notifications.warning(title, message?)`

```typescript
warning(title: string, message?: string): string;
```

Displays a warning notification. Returns the notification ID.

#### `sdk.notifications.error(title, message?)`

```typescript
error(title: string, message?: string): string;
```

Displays an error notification. Returns the notification ID.

#### `sdk.notifications.dismiss(id)`

```typescript
dismiss(id: string): void;
```

Dismisses a notification by its ID.

| Parameter | Type     | Description                        |
|-----------|----------|------------------------------------|
| `id`      | `string` | The notification ID to dismiss.    |

---

### `sdk.settings`

Global settings service. Settings are defined with schemas (type, default, description) and stored centrally.

#### `sdk.settings.get(key)`

```typescript
get<T extends SettingValue>(key: string): T | undefined;
```

Reads the current value of a setting. Returns `undefined` if the setting is not registered or has no value.

**Type parameter:** `T extends SettingValue` where `SettingValue = string | number | boolean`.

#### `sdk.settings.set(key, value)`

```typescript
set(key: string, value: SettingValue): void;
```

Updates the value of a setting.

| Parameter | Type           | Description                      |
|-----------|----------------|----------------------------------|
| `key`     | `string`       | The setting key.                 |
| `value`   | `SettingValue`  | The new value (`string`, `number`, or `boolean`). |

#### `sdk.settings.onChange(key, handler)`

```typescript
onChange(key: string, handler: (value: SettingValue) => void): () => void;
```

Subscribes to changes on a specific setting key.

**Returns:** `() => void` -- An unsubscribe function.

---

### `sdk.storage`

Scoped `localStorage` wrapper. All keys are automatically namespaced with the pattern `archbase:{appId}:{key}` to prevent conflicts between apps.

#### `sdk.storage.get(key)`

```typescript
get<T>(key: string): T | null;
```

Reads a value from storage. Internally calls `JSON.parse` on the raw string. Returns `null` if the key does not exist or parsing fails.

#### `sdk.storage.set(key, value)`

```typescript
set(key: string, value: unknown): void;
```

Writes a value to storage. Internally calls `JSON.stringify`. Silently fails if storage is full or unavailable.

#### `sdk.storage.remove(key)`

```typescript
remove(key: string): void;
```

Removes a single key from storage.

#### `sdk.storage.clear()`

```typescript
clear(): void;
```

Removes all keys belonging to the current app (matching the `archbase:{appId}:` prefix). Does not affect other apps' storage.

#### `sdk.storage.keys()`

```typescript
keys(): string[];
```

Returns all storage keys belonging to the current app, with the namespace prefix stripped.

---

### `sdk.contextMenu`

Context menu service for displaying right-click menus.

#### `sdk.contextMenu.show(position, items)`

```typescript
show(
  position: { x: number; y: number },
  items: ContextMenuItem[],
): void;
```

| Parameter  | Type                | Description                           |
|------------|---------------------|---------------------------------------|
| `position` | `{ x: number; y: number }` | Screen coordinates for the menu. |
| `items`    | `ContextMenuItem[]` | Array of menu items to display.       |

**`ContextMenuItem` type:**

```typescript
interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  action?: () => void;
  children?: ContextMenuItem[];
}
```

| Property     | Type                  | Description                                         |
|--------------|-----------------------|-----------------------------------------------------|
| `id`         | `string`              | Unique identifier for the menu item.                |
| `label`      | `string`              | Display text for the menu item.                     |
| `icon?`      | `string`              | Optional icon identifier.                           |
| `shortcut?`  | `string`              | Optional keyboard shortcut hint (e.g. `"Ctrl+C"`).  |
| `disabled?`  | `boolean`             | Whether the item is grayed out.                     |
| `separator?` | `boolean`             | If `true`, renders a visual separator line.         |
| `action?`    | `() => void`          | Callback when clicked. Optional for separators.     |
| `children?`  | `ContextMenuItem[]`   | Nested sub-menu items.                              |

---

### `sdk.permissions`

Permission management service. Behavior differs between `createWorkspaceSDK` (stub) and `createSecureSDK` (enforced).

#### `sdk.permissions.check(permission)`

```typescript
check(permission: Permission): PermissionGrant;
```

Checks the current grant status for a permission.

**Returns:** `PermissionGrant` -- one of `'granted'`, `'denied'`, or `'prompt'`.

| SDK variant         | Behavior                                                          |
|---------------------|-------------------------------------------------------------------|
| `createWorkspaceSDK` | Always returns `'denied'` (fail-closed stub).                    |
| `createSecureSDK`    | Returns the actual grant status. Returns `'denied'` for permissions not declared in the manifest even if they are in `'prompt'` state. |

#### `sdk.permissions.request(permission)`

```typescript
request(permission: Permission): Promise<boolean>;
```

Requests a permission from the user. If the permission is already granted, resolves immediately. If denied, resolves to `false`. If in `'prompt'` state and declared in the manifest, triggers the permission prompt UI.

**Returns:** `Promise<boolean>` -- `true` if the permission was granted, `false` otherwise.

| SDK variant         | Behavior                                                          |
|---------------------|-------------------------------------------------------------------|
| `createWorkspaceSDK` | Always resolves to `false`.                                      |
| `createSecureSDK`    | Triggers the permission store's prompt flow, showing the app's display name and icon. |

#### `sdk.permissions.list()`

```typescript
list(): Array<{ permission: Permission; grant: PermissionGrant }>;
```

Lists all known permissions and their current grant status.

| SDK variant         | Behavior                                                          |
|---------------------|-------------------------------------------------------------------|
| `createWorkspaceSDK` | Always returns `[]`.                                             |
| `createSecureSDK`    | Returns all permissions with their effective grant status (undeclared permissions in `'prompt'` state are reported as `'denied'`). |

**Available `Permission` values:**

| Permission          | Description                    | Enforced |
|---------------------|--------------------------------|----------|
| `'notifications'`   | Display toast notifications    | Yes      |
| `'storage'`         | Read/write scoped localStorage | Yes      |
| `'clipboard.read'`  | Read from clipboard            | Future   |
| `'clipboard.write'` | Write to clipboard             | Future   |
| `'filesystem.read'` | Read from filesystem           | Future   |
| `'filesystem.write'`| Write to filesystem            | Future   |
| `'network'`         | Make network requests          | Future   |
| `'camera'`          | Access camera                  | Future   |
| `'microphone'`      | Access microphone              | Future   |
| `'collaboration'`   | Join rooms, share cursors, sync presence | `sdk.collaboration.*` |

---

### `sdk.collaboration`

Provides access to real-time collaboration features. Requires the `'collaboration'` permission.

| Method          | Signature                                                        | Description                              |
|-----------------|------------------------------------------------------------------|------------------------------------------|
| `join`          | `(roomId: string, user: { displayName: string }) => Promise<void>` | Join a collaboration room              |
| `leave`         | `() => void`                                                     | Leave the current room                   |
| `getUsers`      | `() => UserPresence[]`                                           | Get online users in the room             |
| `setStatus`     | `(status: 'active' \| 'idle' \| 'away') => void`                | Set local presence status                |
| `shareWindow`   | `(windowId: string) => void`                                     | Start sharing a window                   |
| `unshareWindow` | `(windowId: string) => void`                                     | Stop sharing a window                    |
| `followUser`    | `(userId: string) => void`                                       | Follow another user's navigation         |
| `unfollowUser`  | `() => void`                                                     | Stop following a user                    |

**Events:**

The collaboration service emits events through the collaboration store. Use `useCollaboration()` hook in React components to reactively subscribe.

---

## 6. Bridge APIs

The Bridge APIs enable communication between the host workspace and sandboxed iframe applications via `postMessage`. This is used when an app runs inside an `<iframe>` with restricted sandbox attributes instead of being loaded in-process via Module Federation.

### Protocol Overview

All bridge messages carry the `__archbase_bridge__` marker to distinguish them from other `postMessage` traffic. The protocol uses a request/response pattern:

```
iframe (BridgeRequest)  --->  host (HostBridge)
                               |
                               v
                         Dispatch to real SDK
                               |
                               v
host (BridgeResponse)   <---  result / error
```

### `createHostBridge(options)`

Creates the host-side bridge that listens for SDK requests from a sandboxed iframe and dispatches them to a real `WorkspaceSDK` instance.

**Signature:**

```typescript
function createHostBridge(options: HostBridgeOptions): () => void;
```

**`HostBridgeOptions`:**

```typescript
interface HostBridgeOptions {
  /** The SDK instance to dispatch calls to */
  sdk: WorkspaceSDK;
  /** The iframe element to communicate with */
  iframe: HTMLIFrameElement;
  /** Expected origin of the iframe. Use '*' only in dev. */
  origin: string;
}
```

**Returns:** `() => void` -- A cleanup function that removes the message event listener.

**Security features:**

- **Origin validation:** Rejects messages from unexpected origins (unless `origin` is `'*'`).
- **Source validation:** Only accepts messages from the specified iframe's `contentWindow`.
- **Method whitelist:** Only a specific set of SDK methods can be invoked through the bridge.

**Allowed methods:**

| Namespace        | Methods                                               |
|------------------|-------------------------------------------------------|
| `windows`        | `open`, `close`, `minimize`, `maximize`, `restore`, `setTitle`, `getAll` |
| `commands`       | `execute`                                             |
| `notifications`  | `info`, `success`, `warning`, `error`, `dismiss`      |
| `settings`       | `get`, `set`                                          |
| `storage`        | `get`, `set`, `remove`, `clear`, `keys`               |
| `contextMenu`    | `show`                                                |
| `permissions`    | `check`, `request`, `list`                            |

> **Note:** `commands.register` is intentionally excluded because callback functions cannot be serialized via `postMessage`.

**Example:**

```tsx
import { createHostBridge, createSecureSDK } from '@archbase/workspace-sdk';

function SandboxedAppHost({ manifest, windowId }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const sdk = createSecureSDK(manifest.id, windowId, manifest);
    const cleanup = createHostBridge({
      sdk,
      iframe: iframeRef.current!,
      origin: manifest.sandbox?.origin ?? '*',
    });
    return cleanup;
  }, [manifest, windowId]);

  return <iframe ref={iframeRef} src={manifest.sandbox?.url} sandbox="allow-scripts" />;
}
```

---

### `createIframeBridgeSDK(appId, windowId, options?)`

Creates a `WorkspaceSDK`-compatible object inside a sandboxed iframe that communicates with the host via `postMessage`.

**Signature:**

```typescript
function createIframeBridgeSDK(
  appId: string,
  windowId: string,
  options?: IframeBridgeOptions,
): IframeBridgeSDK;
```

**`IframeBridgeOptions`:**

```typescript
interface IframeBridgeOptions {
  /** Target origin for postMessage. Defaults to '*'. Set to host origin in production. */
  targetOrigin?: string;
}
```

**Returns:** `IframeBridgeSDK` -- An extended `WorkspaceSDK` with the additional `destroy()` method.

**`IframeBridgeSDK` interface:**

```typescript
interface IframeBridgeSDK extends Omit<WorkspaceSDK, 'windows'> {
  /** Clean up the bridge listener and reject all pending requests */
  destroy(): void;

  readonly windows: {
    /** Returns a Promise (async over bridge, unlike sync host SDK) */
    open(opts: { title: string; width?: number; height?: number; props?: Record<string, unknown> }): Promise<string>;
    close(windowId?: string): void;
    minimize(windowId?: string): void;
    maximize(windowId?: string): void;
    restore(windowId?: string): void;
    setTitle(title: string, windowId?: string): void;
    /** Returns a Promise (async over bridge, unlike sync host SDK) */
    getAll(): Promise<Array<{ id: string; title: string; state: WindowState }>>;
  };
}
```

**Key differences from the host SDK:**

| Service / Method                 | Host SDK       | Bridge SDK                              |
|----------------------------------|----------------|-----------------------------------------|
| `windows.open()`                 | Sync, returns `string` | **Async**, returns `Promise<string>` |
| `windows.getAll()`               | Sync, returns array    | **Async**, returns `Promise<Array<...>>` |
| `commands.register()`            | Registers handler      | **No-op** (callbacks cannot be serialized) |
| `settings.get()`                 | Returns value          | **Always returns `undefined`** (sync cannot bridge) |
| `settings.onChange()`            | Subscribes             | **No-op** (callbacks cannot be serialized) |
| `storage.get()`                  | Returns value          | **Always returns `null`** (sync cannot bridge) |
| `storage.keys()`                 | Returns keys           | **Always returns `[]`** (sync cannot bridge) |
| `permissions.check()`            | Returns grant          | **Always returns `'denied'`** (sync cannot bridge) |
| `permissions.list()`             | Returns list           | **Always returns `[]`** (sync cannot bridge) |
| `contextMenu.show()`             | Full `action` support  | **`action` callbacks stripped** (not serializable) |

**Timeout behavior:** All bridged calls have a default timeout of **10 seconds** (10,000 ms). If the host does not respond within this period, the promise is rejected with a `Bridge timeout` error.

**Fire-and-forget methods:** Methods that return `void` (close, minimize, maximize, restore, setTitle, all notifications except the returned ID, storage writes, dismiss) use a fire-and-forget pattern -- they send the request but do not wait for or propagate errors.

**Example:**

```typescript
import { createIframeBridgeSDK } from '@archbase/workspace-sdk';

// Inside a sandboxed iframe app:
const sdk = createIframeBridgeSDK('my-sandboxed-app', 'win-123', {
  targetOrigin: 'http://localhost:3000',
});

// Async: must await
const newWindowId = await sdk.windows.open({ title: 'Child Window' });

// Fire-and-forget
sdk.notifications.info('Ready', 'Sandboxed app loaded.');

// Async permission request
const hasNotifications = await sdk.permissions.request('notifications');

// Cleanup on app teardown
sdk.destroy();
```

---

### `isBridgeMessage(data)`

Type guard that determines whether an unknown value is a valid bridge message.

**Signature:**

```typescript
function isBridgeMessage(data: unknown): data is BridgeMessage;
```

**Returns:** `true` if the data is a valid bridge message with the `__archbase_bridge__` marker and a recognized type.

**Recognized message types:**

| Type             | Direction       | Description                               |
|------------------|-----------------|-------------------------------------------|
| `'sdk-request'`  | iframe -> host  | SDK method invocation request.            |
| `'sdk-response'` | host -> iframe  | Successful response with result.          |
| `'sdk-error'`    | host -> iframe  | Error response with error message string. |
| `'sdk-event'`    | host -> iframe  | Push event (reserved for future use).     |

**Constant:**

```typescript
const BRIDGE_MARKER = '__archbase_bridge__';
```

---

## 7. Types Reference

### Core SDK Types

```typescript
/** SDK instance scoped to a specific app and window */
interface WorkspaceSDK {
  readonly appId: string;
  readonly windowId: string;
  readonly windows: { /* see sdk.windows */ };
  readonly commands: { /* see sdk.commands */ };
  readonly notifications: { /* see sdk.notifications */ };
  readonly settings: { /* see sdk.settings */ };
  readonly storage: { /* see sdk.storage */ };
  readonly contextMenu: { /* see sdk.contextMenu */ };
  readonly permissions: { /* see sdk.permissions */ };
}
```

### Window Types

```typescript
type WindowState = 'normal' | 'minimized' | 'maximized';
```

### Permission Types

```typescript
type Permission =
  | 'notifications'
  | 'storage'
  | 'clipboard.read'
  | 'clipboard.write'
  | 'filesystem.read'
  | 'filesystem.write'
  | 'network'
  | 'camera'
  | 'microphone';

type PermissionGrant = 'granted' | 'denied' | 'prompt';
```

### Setting Types

```typescript
type SettingValue = string | number | boolean;
```

### Command Types

```typescript
type CommandHandler = (...args: unknown[]) => void | Promise<void>;
```

### Context Menu Types

```typescript
interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  action: () => void;
}
```

### Bridge Message Types

```typescript
const BRIDGE_MARKER = '__archbase_bridge__';

/** Request sent from iframe to host */
interface BridgeRequest {
  [BRIDGE_MARKER]: true;
  type: 'sdk-request';
  id: string;       // Unique correlation ID
  method: string;   // Dot-notation path, e.g. 'windows.open'
  args: unknown[];  // Arguments for the SDK method
}

/** Successful response from host to iframe */
interface BridgeResponse {
  [BRIDGE_MARKER]: true;
  type: 'sdk-response';
  id: string;
  result: unknown;
}

/** Error response from host to iframe */
interface BridgeError {
  [BRIDGE_MARKER]: true;
  type: 'sdk-error';
  id: string;
  error: string;
}

/** Push event from host to iframe (reserved for future use) */
interface BridgeEvent {
  [BRIDGE_MARKER]: true;
  type: 'sdk-event';
  event: string;
  payload: unknown;
}

/** Union of all message types */
type BridgeMessage = BridgeRequest | BridgeResponse | BridgeError | BridgeEvent;
```

### Provider Types

```typescript
interface WorkspaceProviderProps {
  value: WorkspaceSDK;
  children: React.ReactNode;
}
```

### Bridge Options Types

```typescript
interface HostBridgeOptions {
  sdk: WorkspaceSDK;
  iframe: HTMLIFrameElement;
  origin: string;
}

interface IframeBridgeOptions {
  targetOrigin?: string;
}

interface IframeBridgeSDK extends Omit<WorkspaceSDK, 'windows'> {
  destroy(): void;
  readonly windows: {
    open(opts: { title: string; width?: number; height?: number; props?: Record<string, unknown> }): Promise<string>;
    close(windowId?: string): void;
    minimize(windowId?: string): void;
    maximize(windowId?: string): void;
    restore(windowId?: string): void;
    setTitle(title: string, windowId?: string): void;
    getAll(): Promise<Array<{ id: string; title: string; state: WindowState }>>;
  };
}
```

---

## 8. Examples

### Example 1: Basic Remote App with Module Federation

A complete remote app that uses the SDK via React hooks:

```tsx
// apps/notes/src/App.tsx
import React, { useState } from 'react';
import {
  WorkspaceProvider,
  useWorkspace,
  useWindowContext,
  useCommand,
  useStorage,
  useSettingValue,
} from '@archbase/workspace-sdk';
import type { WorkspaceSDK } from '@archbase/workspace-types';

function NotesEditor() {
  const sdk = useWorkspace();
  const { isFocused, setTitle } = useWindowContext();
  const [notes, setNotes] = useStorage<string[]>('notes', []);
  const [fontSize, setFontSize] = useSettingValue<number>('editor.fontSize');
  const [draft, setDraft] = useState('');

  // Register commands
  useCommand('notes.add', () => {
    if (draft.trim()) {
      setNotes([...notes, draft.trim()]);
      setDraft('');
      setTitle(`Notes (${notes.length + 1})`);
      sdk.notifications.success('Note added');
    }
  });

  useCommand('notes.clear', () => {
    setNotes([]);
    setTitle('Notes (0)');
  });

  return (
    <div style={{ opacity: isFocused ? 1 : 0.8, fontSize: fontSize ?? 14 }}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type a note..."
      />
      <button onClick={() => sdk.commands.execute('notes.add')}>
        Add
      </button>
      <ul>
        {notes.map((note, i) => (
          <li key={i}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

// Exported entrypoint, receives SDK from the host
export default function NotesApp({ sdk }: { sdk: WorkspaceSDK }) {
  return (
    <WorkspaceProvider value={sdk}>
      <NotesEditor />
    </WorkspaceProvider>
  );
}
```

### Example 2: Permission-Aware App

An app that requests permissions before using gated services:

```tsx
// apps/secure-app/src/App.tsx
import React, { useEffect, useState } from 'react';
import { WorkspaceProvider, useWorkspace } from '@archbase/workspace-sdk';
import type { WorkspaceSDK } from '@archbase/workspace-types';

function SecureContent() {
  const sdk = useWorkspace();
  const [hasNotifications, setHasNotifications] = useState(false);
  const [hasStorage, setHasStorage] = useState(false);

  useEffect(() => {
    async function requestPermissions() {
      const notifGranted = await sdk.permissions.request('notifications');
      setHasNotifications(notifGranted);

      const storageGranted = await sdk.permissions.request('storage');
      setHasStorage(storageGranted);
    }
    requestPermissions();
  }, [sdk]);

  const handleSave = () => {
    if (hasStorage) {
      sdk.storage.set('data', { timestamp: Date.now() });
    }
    if (hasNotifications) {
      sdk.notifications.success('Saved', 'Data persisted to storage.');
    }
  };

  return (
    <div>
      <p>Notifications: {hasNotifications ? 'Granted' : 'Denied'}</p>
      <p>Storage: {hasStorage ? 'Granted' : 'Denied'}</p>
      <button onClick={handleSave} disabled={!hasStorage}>
        Save Data
      </button>
    </div>
  );
}

export default function SecureApp({ sdk }: { sdk: WorkspaceSDK }) {
  return (
    <WorkspaceProvider value={sdk}>
      <SecureContent />
    </WorkspaceProvider>
  );
}
```

### Example 3: Sandboxed Iframe App

An app running inside a sandboxed iframe using the bridge SDK:

```html
<!-- apps/sandboxed/index.html -->
<!DOCTYPE html>
<html>
<body>
  <div id="app">
    <h1>Sandboxed App</h1>
    <button id="notify">Send Notification</button>
    <button id="open">Open New Window</button>
  </div>
  <script type="module">
    import { createIframeBridgeSDK } from '@archbase/workspace-sdk';

    // appId and windowId are typically passed via URL params or postMessage handshake
    const params = new URLSearchParams(location.search);
    const appId = params.get('appId') ?? 'sandboxed-app';
    const windowId = params.get('windowId') ?? 'unknown';

    const sdk = createIframeBridgeSDK(appId, windowId, {
      targetOrigin: 'http://localhost:3000',
    });

    document.getElementById('notify').addEventListener('click', () => {
      sdk.notifications.info('Hello from iframe!');
    });

    document.getElementById('open').addEventListener('click', async () => {
      const newId = await sdk.windows.open({ title: 'Child Window', width: 400, height: 300 });
      console.log('Opened window:', newId);
    });

    // Cleanup on unload
    window.addEventListener('unload', () => sdk.destroy());
  </script>
</body>
</html>
```

### Example 4: Host-Side Bridge Setup

Setting up the host bridge for a sandboxed app:

```tsx
// packages/core/src/components/SandboxedAppRenderer.tsx
import React, { useRef, useEffect } from 'react';
import { createSecureSDK, createHostBridge } from '@archbase/workspace-sdk';
import type { AppManifest } from '@archbase/workspace-types';

interface Props {
  manifest: AppManifest;
  windowId: string;
}

export function SandboxedAppRenderer({ manifest, windowId }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sdk = createSecureSDK(manifest.id, windowId, manifest);

    const sandboxConfig = typeof manifest.sandbox === 'object' ? manifest.sandbox : {};
    const origin = sandboxConfig.origin ?? '*';

    const cleanup = createHostBridge({ sdk, iframe, origin });
    return cleanup;
  }, [manifest, windowId]);

  const sandboxUrl = typeof manifest.sandbox === 'object'
    ? manifest.sandbox.url
    : manifest.entrypoint;

  const sandboxAttr = ['allow-scripts'];
  if (typeof manifest.sandbox === 'object' && manifest.sandbox.allow) {
    sandboxAttr.push(
      ...manifest.sandbox.allow.filter((a) => a !== 'allow-same-origin'),
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={`${sandboxUrl}?appId=${manifest.id}&windowId=${windowId}`}
      sandbox={sandboxAttr.join(' ')}
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
}
```

### Example 5: Context Menu Usage

```tsx
import { useWorkspace } from '@archbase/workspace-sdk';

function FileList() {
  const sdk = useWorkspace();

  const handleContextMenu = (e: React.MouseEvent, fileName: string) => {
    e.preventDefault();
    sdk.contextMenu.show({ x: e.clientX, y: e.clientY }, [
      {
        id: 'open',
        label: 'Open',
        icon: 'folder-open',
        action: () => sdk.commands.execute('file.open', fileName),
      },
      {
        id: 'rename',
        label: 'Rename',
        icon: 'edit',
        action: () => sdk.commands.execute('file.rename', fileName),
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: 'trash',
        disabled: false,
        action: () => sdk.commands.execute('file.delete', fileName),
      },
    ]);
  };

  return (
    <ul>
      {['readme.md', 'index.ts'].map((file) => (
        <li key={file} onContextMenu={(e) => handleContextMenu(e, file)}>
          {file}
        </li>
      ))}
    </ul>
  );
}
```

---

## Appendix: Exports Summary

The following table lists all public exports from `@archbase/workspace-sdk`:

| Export                    | Kind       | Category    |
|---------------------------|------------|-------------|
| `createWorkspaceSDK`     | Function   | Core        |
| `createSecureSDK`        | Function   | Core        |
| `WorkspaceProvider`      | Component  | Context     |
| `WorkspaceContext`        | Context    | Context     |
| `WorkspaceProviderProps` | Type       | Context     |
| `useWorkspace`           | Hook       | Hooks       |
| `useWindowContext`       | Hook       | Hooks       |
| `useCommand`             | Hook       | Hooks       |
| `useSettingValue`        | Hook       | Hooks       |
| `useStorage`             | Hook       | Hooks       |
| `createHostBridge`       | Function   | Bridge      |
| `HostBridgeOptions`      | Type       | Bridge      |
| `createIframeBridgeSDK`  | Function   | Bridge      |
| `IframeBridgeSDK`        | Type       | Bridge      |
| `IframeBridgeOptions`    | Type       | Bridge      |
| `isBridgeMessage`        | Function   | Bridge      |
| `BRIDGE_MARKER`          | Constant   | Bridge      |
| `BridgeRequest`          | Type       | Bridge      |
| `BridgeResponse`         | Type       | Bridge      |
| `BridgeError`            | Type       | Bridge      |
| `BridgeEvent`            | Type       | Bridge      |
| `BridgeMessage`          | Type       | Bridge      |
| `useTheme`               | Hook       | Hooks       |
| `useAsyncStorage`        | Hook       | Hooks       |
| `useCollaboration`       | Hook       | Hooks       |
| `createAsyncStorageService` | Function | Storage     |
| `IndexedDBProvider`      | Class      | Storage     |
| `registerStorageProvider` | Function  | Storage     |
| `setDefaultProvider`     | Function   | Storage     |
| `getStorageProvider`     | Function   | Storage     |
| `listStorageProviders`   | Function   | Storage     |
| `LocalStorageProvider`   | Class      | Storage     |
| `StorageProvider`        | Type       | Storage     |
| `createCollaborationService` | Function | Collaboration |
| `WorkspaceSDK`           | Type       | Re-export   |
