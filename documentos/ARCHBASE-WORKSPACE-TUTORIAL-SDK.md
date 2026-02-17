# Tutorial: Using the Workspace SDK

> **Difficulty:** Intermediate
> **Time:** ~45 minutes
> **Prerequisites:** Familiarity with React hooks, a working Archbase Workspace app
> **Last updated:** 2026-02-16

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Setting Up WorkspaceProvider](#2-setting-up-workspaceprovider)
3. [Available Hooks](#3-available-hooks)
   - [useWorkspace()](#31-useworkspace)
   - [useWindowContext()](#32-usewindowcontext)
   - [useStorage()](#33-usestoragekey-defaultvalue)
   - [useAsyncStorage()](#34-useasyncstorage)
   - [useCommand()](#35-usecommandcommandid-handler)
   - [useSettingValue()](#36-usesettingvaluekey)
   - [useTheme()](#37-usetheme)
   - [useCollaboration()](#38-usecollaboration)
4. [Communication Between Apps](#4-communication-between-apps)
5. [Keybindings](#5-keybindings)
6. [Persistence with StorageService](#6-persistence-with-storageservice)
7. [Complete Example: Dashboard App](#7-complete-example-dashboard-app)

---

## 1. Introduction

The Archbase Workspace SDK (`@archbase/workspace-sdk`) is the primary interface between your remote app and the host workspace shell. It provides:

- **Window management** -- open, close, minimize, maximize windows.
- **Commands** -- register and execute commands across apps.
- **Notifications** -- display toast messages.
- **Settings** -- read and write workspace-level settings.
- **Storage** -- scoped, persistent key-value storage per app.
- **Context menus** -- show right-click menus.
- **Permissions** -- gated access to sensitive services.
- **Theming** -- reactive theme access.
- **Collaboration** -- real-time multi-user state.

The SDK follows a **scoped, permission-aware** design. Every SDK instance is scoped to a specific `appId` and `windowId`, meaning storage keys are namespaced and commands are traceable.

### Architecture

```
Host Shell (packages/core)
 |
 ├── createSecureSDK(appId, windowId, manifest)
 |     |
 |     ├── sdk.windows    ── WindowsStore
 |     ├── sdk.commands   ── CommandStore
 |     ├── sdk.notifications ── NotificationStore
 |     ├── sdk.settings   ── SettingsStore
 |     ├── sdk.storage    ── localStorage (namespaced)
 |     ├── sdk.contextMenu ── ContextMenuStore
 |     ├── sdk.permissions ── PermissionStore
 |     └── sdk.collaboration ── CollaborationStore
 |
 └── <WorkspaceProvider value={sdk}>
       └── Your App
             ├── useWorkspace()
             ├── useWindowContext()
             ├── useStorage()
             ├── useCommand()
             ├── useSettingValue()
             ├── useTheme()
             └── useCollaboration()
```

---

## 2. Setting Up WorkspaceProvider

Every SDK hook requires the `WorkspaceProvider` context. The host shell sets this up automatically when mounting your app, but understanding the mechanism is important.

### How the host provides the SDK

When the host loads your app via Module Federation, it creates an SDK instance and wraps your component:

```tsx
// This happens inside the host shell -- you don't write this code.
import { createSecureSDK, WorkspaceProvider } from '@archbase/workspace-sdk';

const sdk = createSecureSDK(manifest.id, windowId, manifest);

// Your App component is loaded via loadRemote() and rendered like this:
<WorkspaceProvider value={sdk}>
  <YourApp />
</WorkspaceProvider>
```

### Your app component

Your default export receives the SDK context automatically. Just use hooks:

```tsx
// apps/my-app/src/App.tsx
import { useWorkspace, useWindowContext } from '@archbase/workspace-sdk';

export default function MyApp() {
  const sdk = useWorkspace();       // Full SDK access
  const ctx = useWindowContext();    // Window-specific utilities

  return <div>App ID: {sdk.appId}, Window: {ctx.windowId}</div>;
}
```

### Manual setup for testing

When unit testing your components, provide a mock SDK:

```tsx
import { WorkspaceProvider } from '@archbase/workspace-sdk';
import { render } from '@testing-library/react';
import type { WorkspaceSDK } from '@archbase/workspace-types';

const mockSDK: WorkspaceSDK = {
  appId: 'test-app',
  windowId: 'win-1',
  windows: {
    open: vi.fn(() => 'win-2'),
    close: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    restore: vi.fn(),
    setTitle: vi.fn(),
    getAll: vi.fn(() => []),
  },
  commands: {
    register: vi.fn(() => vi.fn()),
    execute: vi.fn(),
  },
  notifications: {
    info: vi.fn(() => 'n-1'),
    success: vi.fn(() => 'n-2'),
    warning: vi.fn(() => 'n-3'),
    error: vi.fn(() => 'n-4'),
    dismiss: vi.fn(),
  },
  settings: {
    get: vi.fn(),
    set: vi.fn(),
    onChange: vi.fn(() => vi.fn()),
  },
  storage: {
    get: vi.fn(() => null),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    keys: vi.fn(() => []),
  },
  contextMenu: { show: vi.fn() },
  permissions: {
    check: vi.fn(() => 'granted'),
    request: vi.fn(async () => true),
    list: vi.fn(() => []),
  },
  collaboration: { /* ... */ } as any,
};

render(
  <WorkspaceProvider value={mockSDK}>
    <MyApp />
  </WorkspaceProvider>
);
```

---

## 3. Available Hooks

### 3.1 useWorkspace()

Returns the full `WorkspaceSDK` instance. This is the escape hatch when you need direct access to any service.

```tsx
import { useWorkspace } from '@archbase/workspace-sdk';

function Dashboard() {
  const sdk = useWorkspace();

  // Access any service directly
  const allWindows = sdk.windows.getAll();
  const appId = sdk.appId;
  const windowId = sdk.windowId;

  const openSettings = () => {
    sdk.commands.execute('workspace.openSettings');
  };

  return (
    <div>
      <p>Running as {appId} in window {windowId}</p>
      <p>{allWindows.length} window(s) open for this app</p>
      <button onClick={openSettings}>Open Settings</button>
    </div>
  );
}
```

**When to use:** When you need low-level control or services not covered by convenience hooks.

---

### 3.2 useWindowContext()

Returns window-specific utilities with a reactive `isFocused` property.

```tsx
import { useWindowContext } from '@archbase/workspace-sdk';

function EditorWindow() {
  const { windowId, close, minimize, maximize, restore, setTitle, isFocused } =
    useWindowContext();

  return (
    <div style={{ opacity: isFocused ? 1 : 0.7 }}>
      <header>
        <span>Editing Document</span>
        <div>
          <button onClick={minimize} aria-label="Minimize">_</button>
          <button onClick={maximize} aria-label="Maximize">[]</button>
          <button onClick={close} aria-label="Close">X</button>
        </div>
      </header>
      <button onClick={() => setTitle('Unsaved Changes')}>
        Mark as dirty
      </button>
    </div>
  );
}
```

**Returned properties:**

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | Current window ID |
| `close` | `() => void` | Close the window |
| `minimize` | `() => void` | Minimize to taskbar |
| `maximize` | `() => void` | Fill the viewport |
| `restore` | `() => void` | Restore from min/max |
| `setTitle` | `(title: string) => void` | Update the title bar |
| `isFocused` | `boolean` | Reactive focus state |

**When to use:** Building custom title bars, focus-dependent rendering, or close/minimize controls.

---

### 3.3 useStorage(key, defaultValue)

Persistent key-value storage with a `useState`-like API. Data is scoped to the current app using the `archbase:{appId}:{key}` namespace in `localStorage`.

```tsx
import { useStorage } from '@archbase/workspace-sdk';

interface UserPreferences {
  fontSize: number;
  sortOrder: 'asc' | 'desc';
  sidebarOpen: boolean;
}

function PreferencesPanel() {
  const [prefs, setPrefs] = useStorage<UserPreferences>('preferences', {
    fontSize: 14,
    sortOrder: 'asc',
    sidebarOpen: true,
  });

  const toggleSidebar = () => {
    setPrefs({ ...prefs, sidebarOpen: !prefs.sidebarOpen });
  };

  const changeFontSize = (size: number) => {
    setPrefs({ ...prefs, fontSize: size });
  };

  return (
    <div>
      <label>
        Font Size:
        <input
          type="range"
          min={10}
          max={24}
          value={prefs.fontSize}
          onChange={(e) => changeFontSize(Number(e.target.value))}
        />
        {prefs.fontSize}px
      </label>
      <button onClick={toggleSidebar}>
        {prefs.sidebarOpen ? 'Close' : 'Open'} Sidebar
      </button>
    </div>
  );
}
```

**Behavior notes:**
- On mount, reads the stored value. If none exists, uses `defaultValue`.
- The setter writes to both React state (immediate re-render) and `localStorage` (persistence).
- Data survives page reloads and workspace restarts.
- Limited by `localStorage` quota (~5MB per origin).

**When to use:** Small data that needs to persist: preferences, draft content, UI state.

---

### 3.4 useAsyncStorage()

IndexedDB-backed async storage for larger data. Returns `[value, setValue, isLoading]`.

```tsx
import { useAsyncStorage } from '@archbase/workspace-sdk';

interface Document {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

function DocumentEditor() {
  const [documents, setDocuments, isLoading] = useAsyncStorage<Document[]>(
    'doc-editor',   // appId
    'documents',     // key
    [],              // defaultValue
  );

  if (isLoading) {
    return <div>Loading documents...</div>;
  }

  const saveDocument = (doc: Document) => {
    const updated = documents.map((d) => (d.id === doc.id ? doc : d));
    setDocuments(updated);
  };

  const addDocument = () => {
    const newDoc: Document = {
      id: crypto.randomUUID(),
      title: 'Untitled',
      content: '',
      updatedAt: Date.now(),
    };
    setDocuments([...documents, newDoc]);
  };

  return (
    <div>
      <h3>{documents.length} document(s)</h3>
      <button onClick={addDocument}>New Document</button>
      <ul>
        {documents.map((doc) => (
          <li key={doc.id}>{doc.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Differences from `useStorage`:**

| Feature | `useStorage` | `useAsyncStorage` |
|---------|-------------|-------------------|
| Backend | `localStorage` | IndexedDB |
| API | Sync | Async (with `isLoading`) |
| Capacity | ~5MB | Hundreds of MB |
| Serialization | JSON strings | Native IDB values |
| Best for | Small config | Large datasets |

**When to use:** Storing large files, many records, or binary data that exceeds the 5MB `localStorage` limit.

---

### 3.5 useCommand(commandId, handler)

Registers a command handler that auto-unregisters on unmount. Commands appear in the Command Palette and can be triggered by other apps.

```tsx
import { useState } from 'react';
import { useCommand, useWorkspace } from '@archbase/workspace-sdk';

function TextEditor() {
  const sdk = useWorkspace();
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');

  // Register a save command
  useCommand('editor.save', async () => {
    setSavedContent(content);
    sdk.storage.set('lastDocument', content);
    sdk.notifications.success('Saved', 'Document saved successfully.');
  });

  // Register an undo command
  useCommand('editor.undo', () => {
    setContent(savedContent);
    sdk.notifications.info('Reverted', 'Content restored to last save.');
  });

  // Register a format command
  useCommand('editor.format', () => {
    setContent(content.trim().replace(/\n{3,}/g, '\n\n'));
    sdk.notifications.info('Formatted', 'Whitespace cleaned up.');
  });

  const isDirty = content !== savedContent;

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ width: '100%', height: 200 }}
      />
      <p>{isDirty ? 'Unsaved changes' : 'All changes saved'}</p>
      <button onClick={() => sdk.commands.execute('editor.save')}>
        Save (Cmd+S)
      </button>
    </div>
  );
}
```

**Key behaviors:**
- The handler reference is kept stable via `useRef`, so you can close over changing state without causing re-registrations.
- Auto-unregisters when the component unmounts.
- Commands are globally addressable: `sdk.commands.execute('editor.save')` works from any app.

**When to use:** Any action that should be accessible from the Command Palette or triggerable by other apps.

---

### 3.6 useSettingValue(key)

Reads a workspace setting reactively. Returns `[value, setValue]` similar to `useState`.

```tsx
import { useSettingValue } from '@archbase/workspace-sdk';

function AppearanceSettings() {
  const [theme, setTheme] = useSettingValue<string>('workspace.theme');
  const [fontSize, setFontSize] = useSettingValue<number>('editor.fontSize');
  const [autoSave, setAutoSave] = useSettingValue<boolean>('editor.autoSave');

  return (
    <div>
      <h3>Appearance</h3>

      <label>
        Theme:
        <select
          value={theme ?? 'dark'}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="auto">Auto (OS preference)</option>
        </select>
      </label>

      <label>
        Font Size:
        <input
          type="number"
          min={10}
          max={32}
          value={fontSize ?? 14}
          onChange={(e) => setFontSize(Number(e.target.value))}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={autoSave ?? false}
          onChange={(e) => setAutoSave(e.target.checked)}
        />
        Auto-save
      </label>
    </div>
  );
}
```

**Setting types:** `SettingValue = string | number | boolean`. Complex objects should use `useStorage` instead.

**Declaring settings:** Settings are declared in the app manifest under `contributes.settings`:

```typescript
contributes: {
  settings: [
    {
      key: 'editor.fontSize',
      type: 'number',
      default: 14,
      description: 'Editor font size in pixels',
    },
    {
      key: 'editor.autoSave',
      type: 'boolean',
      default: false,
      description: 'Automatically save changes',
    },
  ],
}
```

**When to use:** Workspace-level preferences that may be shared across apps (theme, locale, etc.) or app-specific settings declared in the manifest.

---

### 3.7 useTheme()

Returns the current theme preference and the resolved theme value, accounting for OS preferences when set to `'auto'`.

```tsx
import { useTheme } from '@archbase/workspace-sdk';

function ChartComponent() {
  const { theme, resolvedTheme } = useTheme();
  // theme: 'dark' | 'light' | 'auto'
  // resolvedTheme: 'dark' | 'light' (auto resolved using OS preference)

  // Use resolvedTheme for conditional styling
  const gridColor = resolvedTheme === 'dark' ? '#334155' : '#e5e7eb';
  const textColor = resolvedTheme === 'dark' ? '#e2e8f0' : '#1f2937';

  return (
    <canvas
      id="chart"
      style={{
        background: resolvedTheme === 'dark' ? '#1e293b' : '#ffffff',
      }}
    >
      {/* Chart rendered with theme-appropriate colors */}
    </canvas>
  );
}
```

```tsx
import { useTheme } from '@archbase/workspace-sdk';

function ThemeDebug() {
  const { theme, resolvedTheme } = useTheme();

  return (
    <div>
      <p>Setting: {theme}</p>
      <p>Resolved: {resolvedTheme}</p>
      <p>
        {theme === 'auto'
          ? `Following OS preference (currently ${resolvedTheme})`
          : `Manually set to ${theme}`}
      </p>
    </div>
  );
}
```

**When to use:** Rendering elements that live outside the CSS custom-property system: Canvas, SVG, charts, inline styles requiring conditional colors.

---

### 3.8 useCollaboration()

Returns reactive selectors for all real-time collaboration state.

```tsx
import { useCollaboration } from '@archbase/workspace-sdk';

function CollaborationPanel() {
  const {
    isConnected,
    roomId,
    currentUser,
    users,
    cursors,
    sharedWindows,
    followingUserId,
  } = useCollaboration();

  if (!isConnected) {
    return <div>Not connected to a collaboration session.</div>;
  }

  return (
    <div>
      <h4>Room: {roomId}</h4>
      <p>You are: {currentUser?.displayName}</p>

      <h5>Online Users ({users.length})</h5>
      <ul>
        {users.map((presence) => (
          <li key={presence.user.id} style={{ color: presence.user.color }}>
            {presence.user.displayName} ({presence.status})
          </li>
        ))}
      </ul>

      <h5>Shared Windows ({sharedWindows.length})</h5>
      <ul>
        {sharedWindows.map((win) => (
          <li key={win.windowId}>
            {win.windowId} - shared by {win.sharedBy}
          </li>
        ))}
      </ul>

      {followingUserId && (
        <p>Following user: {followingUserId}</p>
      )}
    </div>
  );
}
```

**Returned properties:**

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | Whether a collaboration session is active |
| `roomId` | `string \| null` | Current room ID |
| `currentUser` | `CollaborationUser \| null` | Local user info |
| `users` | `UserPresence[]` | Online users |
| `cursors` | `RemoteCursor[]` | Remote cursor positions |
| `sharedWindows` | `SharedWindowInfo[]` | Windows being shared |
| `followingUserId` | `string \| null` | User being followed |

**When to use:** Building collaborative features, presence indicators, shared editing, or follow-mode UI.

---

## 4. Communication Between Apps

Apps communicate through the **command system**. One app registers a command handler; another app executes it.

### Sender App (e.g., File Explorer)

```tsx
import { useWorkspace } from '@archbase/workspace-sdk';

function FileExplorer() {
  const sdk = useWorkspace();

  const openFileInEditor = async (filePath: string) => {
    try {
      // Execute a command registered by the Editor app
      await sdk.commands.execute('editor.openFile', filePath);
      sdk.notifications.info('Opened', `${filePath} opened in editor.`);
    } catch {
      // Command not registered -- editor may not be running
      sdk.notifications.warning(
        'Editor not available',
        'Open the Editor app first.',
      );
    }
  };

  return (
    <ul>
      <li>
        <button onClick={() => openFileInEditor('/readme.md')}>
          readme.md
        </button>
      </li>
      <li>
        <button onClick={() => openFileInEditor('/index.ts')}>
          index.ts
        </button>
      </li>
    </ul>
  );
}
```

### Receiver App (e.g., Editor)

```tsx
import { useState } from 'react';
import { useCommand, useWindowContext } from '@archbase/workspace-sdk';

function Editor() {
  const { setTitle } = useWindowContext();
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState('');

  // Register the command that the File Explorer will call
  useCommand('editor.openFile', (path: unknown) => {
    const file = path as string;
    setFilePath(file);
    setContent(`Contents of ${file}...`);
    setTitle(`Editor - ${file}`);
  });

  return (
    <div>
      {filePath ? (
        <>
          <h3>{filePath}</h3>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} />
        </>
      ) : (
        <p>No file open. Use File Explorer to open a file.</p>
      )}
    </div>
  );
}
```

### Bidirectional communication pattern

```tsx
// App A registers a response command
useCommand('appA.getData', () => {
  return sdk.storage.get<MyData>('data');
});

// App B calls it and gets the result
// Note: commands currently return void/Promise<void>,
// so use storage or a shared state pattern for complex data exchange:

// App A publishes to storage
sdk.storage.set('shared:appA:result', myData);

// App B reads from storage
const data = sdk.storage.get<MyData>('shared:appA:result');
```

---

## 5. Keybindings

Commands can be bound to keyboard shortcuts by declaring them in the manifest.

### Declaring keybindings

```typescript
// In your app manifest (knownManifests.ts)
contributes: {
  commands: [
    {
      id: 'editor.save',
      title: 'Save',
      category: 'Editor',
      icon: '💾',
      keybinding: 'Cmd+S',       // macOS: Cmd+S, Windows/Linux: Ctrl+S
    },
    {
      id: 'editor.find',
      title: 'Find',
      category: 'Editor',
      icon: '🔍',
      keybinding: 'Cmd+F',
    },
    {
      id: 'editor.format',
      title: 'Format Document',
      category: 'Editor',
      icon: '🎨',
      keybinding: 'Cmd+Shift+F',
    },
  ],
}
```

### Using with useCommand

The keybinding is automatically wired to the command. Just register the handler:

```tsx
useCommand('editor.save', () => {
  // This fires when Cmd+S is pressed (while this app has focus)
  saveDocument();
});

useCommand('editor.find', () => {
  setShowFindBar(true);
});
```

### Keybinding format

| Modifier | macOS | Windows/Linux |
|----------|-------|---------------|
| `Cmd` | Command | Ctrl |
| `Shift` | Shift | Shift |
| `Alt` | Option | Alt |
| `Ctrl` | Control | Control |

Combine with `+`: `Cmd+Shift+S`, `Alt+Enter`, `Cmd+K Cmd+S` (chords).

### Scoping

Keybindings are scoped to the app that declares them. When the app's window has focus, its keybindings take priority over global bindings.

---

## 6. Persistence with StorageService

The SDK provides two storage tiers:

### Tier 1: Scoped localStorage (sync)

Accessed via `sdk.storage` or the `useStorage` hook.

```typescript
// Direct service usage
sdk.storage.set('config', { theme: 'dark', lang: 'en' });
const config = sdk.storage.get<{ theme: string; lang: string }>('config');
// config = { theme: 'dark', lang: 'en' }

// List all keys for this app
const keys = sdk.storage.keys();
// keys = ['config', 'tasks', 'draft']

// Remove a single key
sdk.storage.remove('draft');

// Clear all app data
sdk.storage.clear();
```

**Namespacing:** All keys are automatically prefixed with `archbase:{appId}:`. Calling `sdk.storage.set('config', data)` from an app with `appId = 'notes'` writes to `archbase:notes:config` in `localStorage`.

### Tier 2: IndexedDB (async)

For larger data, use the async storage service or `useAsyncStorage` hook.

```typescript
import { createAsyncStorageService } from '@archbase/workspace-sdk';

const asyncStorage = createAsyncStorageService('my-app');

// Write
await asyncStorage.set('documents', largeDocumentArray);

// Read
const docs = await asyncStorage.get<Document[]>('documents');

// Delete
await asyncStorage.remove('documents');

// Clear all app data
await asyncStorage.clear();

// List keys
const keys = await asyncStorage.keys();
```

### StorageProvider abstraction

For advanced use cases, you can register custom storage providers:

```typescript
import {
  registerStorageProvider,
  setDefaultProvider,
  getStorageProvider,
  LocalStorageProvider,
  IndexedDBProvider,
} from '@archbase/workspace-sdk';

// Register providers
registerStorageProvider(new LocalStorageProvider());
registerStorageProvider(new IndexedDBProvider('my-prefix:'));

// Set default
setDefaultProvider('indexedDB');

// Use
const provider = getStorageProvider('indexedDB');
await provider.set('key', value);
const result = await provider.get<MyType>('key');
```

### Choosing a storage tier

| Criterion | localStorage | IndexedDB |
|-----------|-------------|-----------|
| Data size | < 5MB total | Hundreds of MB |
| API | Synchronous | Asynchronous |
| Serialization | JSON only | Native JS objects |
| Speed | Fast for small data | Fast for large data |
| Hook | `useStorage` | `useAsyncStorage` |

---

## 7. Complete Example: Dashboard App

Here is a complete app that uses most SDK features:

```tsx
// apps/dashboard/src/App.tsx
import { useState, useEffect } from 'react';
import {
  useWorkspace,
  useWindowContext,
  useCommand,
  useStorage,
  useSettingValue,
  useTheme,
  useCollaboration,
} from '@archbase/workspace-sdk';

interface Widget {
  id: string;
  type: 'clock' | 'counter' | 'notes';
  title: string;
}

function Dashboard() {
  const sdk = useWorkspace();
  const { isFocused, setTitle } = useWindowContext();
  const { resolvedTheme } = useTheme();
  const { isConnected, users } = useCollaboration();

  // Persistent widget layout
  const [widgets, setWidgets] = useStorage<Widget[]>('widgets', [
    { id: '1', type: 'clock', title: 'Clock' },
    { id: '2', type: 'counter', title: 'Visits' },
  ]);

  // Settings
  const [columns, setColumns] = useSettingValue<number>('dashboard.columns');
  const [showHeader] = useSettingValue<boolean>('dashboard.showHeader');

  // Live clock
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Commands
  useCommand('dashboard.addWidget', (type: unknown) => {
    const widgetType = (type as string) || 'notes';
    const newWidget: Widget = {
      id: crypto.randomUUID(),
      type: widgetType as Widget['type'],
      title: `New ${widgetType}`,
    };
    setWidgets([...widgets, newWidget]);
    sdk.notifications.success('Widget Added', `${newWidget.title} added to dashboard.`);
  });

  useCommand('dashboard.clearWidgets', () => {
    setWidgets([]);
    setTitle('Dashboard (empty)');
  });

  useCommand('dashboard.openInNewWindow', () => {
    const newWindowId = sdk.windows.open({
      title: 'Dashboard - Detached',
      width: 800,
      height: 600,
    });
    sdk.notifications.info('New Window', `Opened window ${newWindowId}`);
  });

  // Context menu
  const handleWidgetContext = (e: React.MouseEvent, widget: Widget) => {
    e.preventDefault();
    sdk.contextMenu.show({ x: e.clientX, y: e.clientY }, [
      {
        id: 'rename',
        label: 'Rename',
        action: () => {
          const updated = widgets.map((w) =>
            w.id === widget.id ? { ...w, title: `${w.title} (renamed)` } : w,
          );
          setWidgets(updated);
        },
      },
      {
        id: 'remove',
        label: 'Remove',
        icon: 'trash',
        action: () => {
          setWidgets(widgets.filter((w) => w.id !== widget.id));
          sdk.notifications.info('Removed', `${widget.title} removed.`);
        },
      },
    ]);
  };

  // Update title with widget count
  useEffect(() => {
    setTitle(`Dashboard (${widgets.length} widgets)`);
  }, [widgets.length, setTitle]);

  return (
    <div
      style={{
        padding: 16,
        opacity: isFocused ? 1 : 0.85,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {(showHeader ?? true) && (
        <header style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Dashboard</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isConnected && (
              <span style={{ fontSize: 12, color: 'var(--collab-badge-bg)' }}>
                {users.size} online
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {resolvedTheme} theme
            </span>
          </div>
        </header>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns ?? 2}, 1fr)`,
          gap: 12,
          flex: 1,
        }}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            onContextMenu={(e) => handleWidgetContext(e, widget)}
            style={{
              padding: 16,
              borderRadius: 8,
              border: '1px solid var(--window-border-color)',
              background: 'var(--window-body-bg)',
            }}
          >
            <h4 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>
              {widget.title}
            </h4>
            {widget.type === 'clock' && (
              <p style={{ fontSize: 24, color: 'var(--text-primary)' }}>
                {time.toLocaleTimeString()}
              </p>
            )}
            {widget.type === 'counter' && (
              <p style={{ fontSize: 24, color: 'var(--text-primary)' }}>42</p>
            )}
            {widget.type === 'notes' && (
              <textarea
                placeholder="Type a note..."
                style={{
                  width: '100%',
                  minHeight: 60,
                  background: 'transparent',
                  border: '1px solid var(--window-border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 4,
                  padding: 8,
                  resize: 'vertical',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return <Dashboard />;
}
```

This example demonstrates:
- `useWorkspace()` for direct SDK access.
- `useWindowContext()` for focus-aware rendering and title updates.
- `useStorage()` for persisting the widget layout.
- `useSettingValue()` for reading column count and header visibility.
- `useTheme()` for theme-aware rendering.
- `useCollaboration()` for online user count.
- `useCommand()` for three Command Palette actions.
- `sdk.contextMenu.show()` for right-click menus.
- `sdk.notifications` for toast messages.
- `sdk.windows.open()` for opening new windows.

---

## Next Steps

- [Tutorial: Theming & Customization](./ARCHBASE-WORKSPACE-TUTORIAL-THEMING.md) -- Customize the visual appearance.
- [Cookbook](./ARCHBASE-WORKSPACE-COOKBOOK.md) -- Quick recipes for common patterns.
- [SDK API Reference](./ARCHBASE-WORKSPACE-SDK-API.md) -- Complete method signatures and types.
- [Tutorial: First Plugin](./ARCHBASE-WORKSPACE-TUTORIAL-FIRST-PLUGIN.md) -- Build and publish a plugin end-to-end.
