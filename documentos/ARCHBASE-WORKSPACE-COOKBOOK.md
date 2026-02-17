# Archbase Workspace Cookbook

> Quick recipes for common patterns. Each recipe is self-contained with copy-paste-ready TypeScript/React code.
> **Last updated:** 2026-02-16

---

## Table of Contents

1. [Open a Window Programmatically](#1-open-a-window-programmatically)
2. [Inter-App Communication via Commands](#2-inter-app-communication-via-commands)
3. [Plugin with Persistent Data Storage](#3-plugin-with-persistent-data-storage)
4. [Custom Keybindings](#4-custom-keybindings)
5. [Notifications](#5-notifications-info-success-warning-error)
6. [Context Menus](#6-context-menus)
7. [Drag & Drop Between Windows](#7-drag--drop-between-windows)
8. [Focus Management](#8-focus-management)
9. [Settings Persistence](#9-settings-persistence)
10. [Collaboration Features](#10-collaboration-features)

---

## 1. Open a Window Programmatically

### Open a new window for the current app

```tsx
import { useWorkspace } from '@archbase/workspace-sdk';

function LauncherButton() {
  const sdk = useWorkspace();

  const openChildWindow = () => {
    const newWindowId = sdk.windows.open({
      title: 'Detail View',
      width: 600,
      height: 400,
      props: {
        itemId: 'abc-123',
        mode: 'readonly',
      },
    });
    console.log('Opened window:', newWindowId);
  };

  return <button onClick={openChildWindow}>Open Detail</button>;
}
```

### Open multiple windows in sequence

```tsx
const sdk = useWorkspace();

const openWorkspace = () => {
  sdk.windows.open({ title: 'Editor', width: 700, height: 500 });
  sdk.windows.open({ title: 'Preview', width: 400, height: 500 });
  sdk.windows.open({ title: 'Console', width: 700, height: 250 });
};
```

### List all windows for the current app

```tsx
const sdk = useWorkspace();

const windows = sdk.windows.getAll();
// [{ id: 'win-1', title: 'Editor', state: 'normal' },
//  { id: 'win-2', title: 'Preview', state: 'minimized' }]
```

### Minimize / maximize / restore / close a specific window

```tsx
const sdk = useWorkspace();

// Operate on the current window (no argument needed)
sdk.windows.minimize();
sdk.windows.maximize();
sdk.windows.restore();
sdk.windows.close();

// Operate on a different window by ID
sdk.windows.minimize('win-abc-123');
sdk.windows.close('win-xyz-456');
```

---

## 2. Inter-App Communication via Commands

### Pattern: Request / Action

**App A** registers a command. **App B** executes it.

**App A -- Receiver (Editor):**

```tsx
import { useState } from 'react';
import { useCommand, useWindowContext } from '@archbase/workspace-sdk';

function Editor() {
  const { setTitle } = useWindowContext();
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState('');

  useCommand('editor.openFile', (path: unknown) => {
    const file = path as string;
    setFilePath(file);
    setContent(`// Contents of ${file}\n`);
    setTitle(`Editor - ${file}`);
  });

  useCommand('editor.getContent', () => {
    // Other apps can read the current content by checking storage
    // (commands return void, so use storage for data exchange)
    return content;
  });

  return (
    <div>
      <h3>{filePath ?? 'No file open'}</h3>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ width: '100%', height: 300 }}
      />
    </div>
  );
}
```

**App B -- Sender (File Explorer):**

```tsx
import { useWorkspace } from '@archbase/workspace-sdk';

function FileExplorer() {
  const sdk = useWorkspace();

  const openInEditor = async (filePath: string) => {
    try {
      await sdk.commands.execute('editor.openFile', filePath);
      sdk.notifications.success('Opened', `${filePath} sent to editor.`);
    } catch {
      sdk.notifications.warning(
        'Editor not available',
        'Open the Editor app first.',
      );
    }
  };

  const files = ['README.md', 'index.ts', 'package.json'];

  return (
    <ul>
      {files.map((file) => (
        <li key={file}>
          <button onClick={() => openInEditor(file)}>{file}</button>
        </li>
      ))}
    </ul>
  );
}
```

### Pattern: Broadcast via shared storage

When multiple apps need to react to the same data:

```tsx
// Publisher app writes to storage
sdk.storage.set('shared:selectedItem', { id: 'item-42', name: 'Widget' });

// Consumer app reads from storage (poll or on-demand)
const item = sdk.storage.get<{ id: string; name: string }>('shared:selectedItem');
```

### Pattern: Event-like communication

Register a command as an event listener, execute it from anywhere:

```tsx
// App A: Subscribe to an "event"
useCommand('myApp.onDataUpdated', (data: unknown) => {
  const payload = data as { count: number };
  setItemCount(payload.count);
});

// App B: Emit the "event"
await sdk.commands.execute('myApp.onDataUpdated', { count: 42 });
```

---

## 3. Plugin with Persistent Data Storage

### Using useStorage (localStorage, sync)

Best for small data (preferences, draft text, small lists).

```tsx
import { useStorage } from '@archbase/workspace-sdk';

interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: number;
}

function BookmarkManager() {
  const [bookmarks, setBookmarks] = useStorage<Bookmark[]>('bookmarks', []);

  const addBookmark = (url: string, title: string) => {
    setBookmarks([
      ...bookmarks,
      { id: crypto.randomUUID(), url, title, createdAt: Date.now() },
    ]);
  };

  const removeBookmark = (id: string) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id));
  };

  return (
    <div>
      <h3>Bookmarks ({bookmarks.length})</h3>
      {bookmarks.map((b) => (
        <div key={b.id} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <a href={b.url} target="_blank" rel="noopener">
            {b.title}
          </a>
          <button onClick={() => removeBookmark(b.id)}>x</button>
        </div>
      ))}
    </div>
  );
}
```

### Using useAsyncStorage (IndexedDB, async)

Best for large datasets (documents, images metadata, caches).

```tsx
import { useAsyncStorage } from '@archbase/workspace-sdk';

interface CacheEntry {
  key: string;
  data: unknown;
  expires: number;
}

function DataCache() {
  const [cache, setCache, isLoading] = useAsyncStorage<CacheEntry[]>(
    'my-app',      // appId
    'apiCache',    // key
    [],            // defaultValue
  );

  if (isLoading) return <div>Loading cache...</div>;

  const addEntry = (key: string, data: unknown, ttlMs: number) => {
    const entry: CacheEntry = { key, data, expires: Date.now() + ttlMs };
    setCache([...cache.filter((e) => e.key !== key), entry]);
  };

  const getEntry = (key: string): unknown | null => {
    const entry = cache.find((e) => e.key === key);
    if (!entry) return null;
    if (Date.now() > entry.expires) return null;
    return entry.data;
  };

  const clearExpired = () => {
    setCache(cache.filter((e) => Date.now() <= e.expires));
  };

  return (
    <div>
      <p>{cache.length} cached entries</p>
      <button onClick={clearExpired}>Clear expired</button>
    </div>
  );
}
```

### Direct service usage (outside React)

```typescript
import { createAsyncStorageService } from '@archbase/workspace-sdk';

const storage = createAsyncStorageService('my-app');

// Write
await storage.set('config', { version: 2, features: ['a', 'b'] });

// Read
const config = await storage.get<{ version: number }>('config');

// Delete
await storage.remove('config');

// List all keys
const keys = await storage.keys();

// Clear all app data
await storage.clear();
```

---

## 4. Custom Keybindings

### Declare keybindings in the manifest

```typescript
// In knownManifests.ts
contributes: {
  commands: [
    {
      id: 'my-app.save',
      title: 'Save',
      category: 'My App',
      icon: '💾',
      keybinding: 'Cmd+S',
    },
    {
      id: 'my-app.find',
      title: 'Find',
      category: 'My App',
      icon: '🔍',
      keybinding: 'Cmd+F',
    },
    {
      id: 'my-app.toggleSidebar',
      title: 'Toggle Sidebar',
      category: 'My App',
      keybinding: 'Cmd+B',
    },
    {
      id: 'my-app.quickAction',
      title: 'Quick Action',
      category: 'My App',
      keybinding: 'Cmd+Shift+A',
    },
  ],
}
```

### Register the handlers

```tsx
import { useState } from 'react';
import { useCommand, useWorkspace } from '@archbase/workspace-sdk';

function MyApp() {
  const sdk = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showFind, setShowFind] = useState(false);

  useCommand('my-app.save', () => {
    sdk.storage.set('lastSave', Date.now());
    sdk.notifications.success('Saved', 'All changes saved.');
  });

  useCommand('my-app.find', () => {
    setShowFind((prev) => !prev);
  });

  useCommand('my-app.toggleSidebar', () => {
    setSidebarOpen((prev) => !prev);
  });

  useCommand('my-app.quickAction', () => {
    sdk.notifications.info('Quick Action', 'Triggered via Cmd+Shift+A');
  });

  return (
    <div style={{ display: 'flex' }}>
      {sidebarOpen && <aside style={{ width: 200 }}>Sidebar</aside>}
      <main style={{ flex: 1 }}>
        {showFind && <div>Find bar...</div>}
        <p>Content</p>
      </main>
    </div>
  );
}
```

### Keybinding format reference

| Notation | macOS | Windows/Linux |
|----------|-------|---------------|
| `Cmd+S` | Command+S | Ctrl+S |
| `Cmd+Shift+P` | Command+Shift+P | Ctrl+Shift+P |
| `Alt+Enter` | Option+Enter | Alt+Enter |
| `Ctrl+Shift+F` | Control+Shift+F | Control+Shift+F |

---

## 5. Notifications (Info, Success, Warning, Error)

### Basic usage

```tsx
import { useWorkspace } from '@archbase/workspace-sdk';

function NotificationDemo() {
  const sdk = useWorkspace();

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button onClick={() => sdk.notifications.info('Info', 'This is informational.')}>
        Info
      </button>
      <button onClick={() => sdk.notifications.success('Success', 'Operation completed.')}>
        Success
      </button>
      <button onClick={() => sdk.notifications.warning('Warning', 'Something needs attention.')}>
        Warning
      </button>
      <button onClick={() => sdk.notifications.error('Error', 'Something went wrong.')}>
        Error
      </button>
    </div>
  );
}
```

### Dismissing notifications programmatically

```tsx
const sdk = useWorkspace();

const showProgress = () => {
  const id = sdk.notifications.info('Uploading...', 'Please wait.');

  // Dismiss after the operation completes
  setTimeout(() => {
    sdk.notifications.dismiss(id);
    sdk.notifications.success('Upload Complete', 'File uploaded successfully.');
  }, 3000);
};
```

### Title-only notifications

```tsx
sdk.notifications.info('File saved');
sdk.notifications.error('Network error');
```

### Notification patterns

**Async operation feedback:**

```tsx
const handleSave = async () => {
  const loadingId = sdk.notifications.info('Saving...');
  try {
    await saveData();
    sdk.notifications.dismiss(loadingId);
    sdk.notifications.success('Saved', 'All changes persisted.');
  } catch (err) {
    sdk.notifications.dismiss(loadingId);
    sdk.notifications.error('Save Failed', String(err));
  }
};
```

**Permission-aware notifications:**

```tsx
// Check permission before using notifications
const granted = await sdk.permissions.request('notifications');
if (granted) {
  sdk.notifications.success('Ready', 'Notifications enabled.');
} else {
  console.log('Notification permission denied.');
}
```

---

## 6. Context Menus

### Basic right-click menu

```tsx
import { useWorkspace } from '@archbase/workspace-sdk';

function FileItem({ name }: { name: string }) {
  const sdk = useWorkspace();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    sdk.contextMenu.show({ x: e.clientX, y: e.clientY }, [
      {
        id: 'open',
        label: 'Open',
        icon: '📂',
        action: () => sdk.commands.execute('editor.openFile', name),
      },
      {
        id: 'copy',
        label: 'Copy Path',
        icon: '📋',
        action: () => navigator.clipboard.writeText(name),
      },
      {
        id: 'rename',
        label: 'Rename',
        icon: '✏️',
        action: () => console.log('Rename', name),
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: '🗑️',
        action: () => console.log('Delete', name),
      },
    ]);
  };

  return (
    <div onContextMenu={handleContextMenu} style={{ padding: '8px 12px', cursor: 'default' }}>
      {name}
    </div>
  );
}
```

### Context menu with disabled items

```tsx
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();
  sdk.contextMenu.show({ x: e.clientX, y: e.clientY }, [
    {
      id: 'undo',
      label: 'Undo',
      icon: '↩️',
      disabled: !canUndo,
      action: () => undo(),
    },
    {
      id: 'redo',
      label: 'Redo',
      icon: '↪️',
      disabled: !canRedo,
      action: () => redo(),
    },
  ]);
};
```

### Context menu with conditional items

```tsx
const handleContextMenu = (e: React.MouseEvent, item: ListItem) => {
  e.preventDefault();

  const items: Array<{
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    action: () => void;
  }> = [
    { id: 'edit', label: 'Edit', action: () => editItem(item) },
  ];

  if (item.starred) {
    items.push({ id: 'unstar', label: 'Remove Star', icon: '⭐', action: () => unstarItem(item) });
  } else {
    items.push({ id: 'star', label: 'Add Star', icon: '☆', action: () => starItem(item) });
  }

  items.push({ id: 'delete', label: 'Delete', icon: '🗑️', action: () => deleteItem(item) });

  sdk.contextMenu.show({ x: e.clientX, y: e.clientY }, items);
};
```

### Desktop-level context menu

```tsx
function Desktop() {
  const sdk = useWorkspace();

  const handleDesktopContext = (e: React.MouseEvent) => {
    e.preventDefault();
    sdk.contextMenu.show({ x: e.clientX, y: e.clientY }, [
      { id: 'new-window', label: 'New Window', action: () => sdk.windows.open({ title: 'New' }) },
      { id: 'refresh', label: 'Refresh', action: () => location.reload() },
      { id: 'settings', label: 'Settings', action: () => sdk.commands.execute('workspace.openSettings') },
    ]);
  };

  return <div onContextMenu={handleDesktopContext} style={{ flex: 1 }} />;
}
```

---

## 7. Drag & Drop Between Windows

Archbase Workspace supports drag and drop between app windows using the standard HTML5 Drag and Drop API. Since all windows are rendered as DOM elements in the same document, data transfer works naturally.

### Source: Draggable item

```tsx
interface DragItem {
  type: string;
  id: string;
  data: unknown;
}

function DraggableCard({ item }: { item: { id: string; name: string } }) {
  const handleDragStart = (e: React.DragEvent) => {
    const payload: DragItem = {
      type: 'card',
      id: item.id,
      data: item,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{
        padding: 12,
        border: '1px solid var(--window-border-color)',
        borderRadius: 6,
        cursor: 'grab',
        background: 'var(--window-body-bg)',
        color: 'var(--text-primary)',
      }}
    >
      {item.name}
    </div>
  );
}
```

### Target: Drop zone in another window

```tsx
import { useState } from 'react';
import { useWorkspace } from '@archbase/workspace-sdk';

function DropZone() {
  const sdk = useWorkspace();
  const [isOver, setIsOver] = useState(false);
  const [dropped, setDropped] = useState<Array<{ id: string; name: string }>>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    try {
      const raw = e.dataTransfer.getData('application/json');
      const payload = JSON.parse(raw) as { type: string; id: string; data: { id: string; name: string } };

      if (payload.type === 'card') {
        setDropped((prev) => [...prev, payload.data]);
        sdk.notifications.success('Dropped', `${payload.data.name} received.`);
      }
    } catch {
      sdk.notifications.error('Drop Failed', 'Invalid drag data.');
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        padding: 16,
        minHeight: 100,
        borderRadius: 8,
        border: `2px dashed ${isOver ? 'var(--btn-primary-bg)' : 'var(--window-border-color)'}`,
        background: isOver ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        transition: 'all 0.15s ease',
      }}
    >
      <p style={{ color: 'var(--text-secondary)' }}>
        {dropped.length === 0
          ? 'Drop items here'
          : `${dropped.length} item(s) received`}
      </p>
      {dropped.map((item) => (
        <div key={item.id} style={{ padding: 4 }}>
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

### Type-safe drag protocol

Define a shared type for your drag data to ensure consistency:

```typescript
// packages/types/src/drag.ts (or a shared module)
export const DRAG_TYPE = 'application/x-archbase-item';

export interface DragPayload {
  sourceAppId: string;
  sourceWindowId: string;
  type: 'file' | 'card' | 'widget';
  id: string;
  data: Record<string, unknown>;
}
```

```tsx
// Source
const payload: DragPayload = {
  sourceAppId: sdk.appId,
  sourceWindowId: sdk.windowId,
  type: 'file',
  id: file.id,
  data: { name: file.name, path: file.path },
};
e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));

// Target
const raw = e.dataTransfer.getData(DRAG_TYPE);
if (raw) {
  const payload = JSON.parse(raw) as DragPayload;
  // Handle...
}
```

---

## 8. Focus Management

### Detect whether your window has focus

```tsx
import { useWindowContext } from '@archbase/workspace-sdk';

function FocusAwareContent() {
  const { isFocused } = useWindowContext();

  return (
    <div
      style={{
        opacity: isFocused ? 1 : 0.7,
        transition: 'opacity 0.2s',
      }}
    >
      <p>{isFocused ? 'Window is focused' : 'Window is not focused'}</p>
    </div>
  );
}
```

### Pause expensive operations when unfocused

```tsx
import { useEffect, useState } from 'react';
import { useWindowContext } from '@archbase/workspace-sdk';

function LiveDataFeed() {
  const { isFocused } = useWindowContext();
  const [data, setData] = useState<number[]>([]);

  useEffect(() => {
    if (!isFocused) return; // Pause polling when not focused

    const interval = setInterval(async () => {
      const response = await fetch('/api/data');
      const newData = await response.json();
      setData(newData);
    }, 1000);

    return () => clearInterval(interval);
  }, [isFocused]);

  return (
    <div>
      <p>{isFocused ? 'Live' : 'Paused'}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

### Reduce animation intensity when unfocused

```tsx
import { useWindowContext } from '@archbase/workspace-sdk';

function AnimatedWidget() {
  const { isFocused } = useWindowContext();

  return (
    <div
      style={{
        animation: isFocused
          ? 'pulse 1s ease-in-out infinite'
          : 'none',
      }}
    >
      Live indicator
    </div>
  );
}
```

### List all windows and their states

```tsx
import { useWorkspace } from '@archbase/workspace-sdk';

function WindowManager() {
  const sdk = useWorkspace();
  const windows = sdk.windows.getAll();

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>State</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {windows.map((win) => (
          <tr key={win.id}>
            <td>{win.id}</td>
            <td>{win.title}</td>
            <td>{win.state}</td>
            <td>
              {win.state === 'minimized' && (
                <button onClick={() => sdk.windows.restore(win.id)}>Restore</button>
              )}
              {win.state === 'normal' && (
                <button onClick={() => sdk.windows.maximize(win.id)}>Maximize</button>
              )}
              <button onClick={() => sdk.windows.close(win.id)}>Close</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 9. Settings Persistence

### Declare settings in the manifest

```typescript
contributes: {
  settings: [
    {
      key: 'my-app.fontSize',
      type: 'number',
      default: 14,
      description: 'Editor font size in pixels',
    },
    {
      key: 'my-app.autoSave',
      type: 'boolean',
      default: true,
      description: 'Automatically save changes every 30 seconds',
    },
    {
      key: 'my-app.language',
      type: 'string',
      default: 'en',
      description: 'UI language (en, pt, es)',
    },
  ],
}
```

### Read settings reactively with useSettingValue

```tsx
import { useSettingValue } from '@archbase/workspace-sdk';

function SettingsAwareEditor() {
  const [fontSize] = useSettingValue<number>('my-app.fontSize');
  const [autoSave] = useSettingValue<boolean>('my-app.autoSave');
  const [language] = useSettingValue<string>('my-app.language');

  return (
    <div style={{ fontSize: fontSize ?? 14 }}>
      <p>Language: {language ?? 'en'}</p>
      <p>Auto-save: {autoSave ? 'Enabled' : 'Disabled'}</p>
      <textarea style={{ fontSize: fontSize ?? 14, width: '100%', height: 200 }} />
    </div>
  );
}
```

### Write settings programmatically

```tsx
import { useSettingValue, useWorkspace } from '@archbase/workspace-sdk';

function FontSizeControl() {
  const [fontSize, setFontSize] = useSettingValue<number>('my-app.fontSize');

  return (
    <div>
      <label>
        Font Size:
        <input
          type="range"
          min={10}
          max={32}
          value={fontSize ?? 14}
          onChange={(e) => setFontSize(Number(e.target.value))}
        />
        <span>{fontSize ?? 14}px</span>
      </label>
    </div>
  );
}
```

### Listen for setting changes via the service

```tsx
import { useEffect } from 'react';
import { useWorkspace } from '@archbase/workspace-sdk';

function SettingsWatcher() {
  const sdk = useWorkspace();

  useEffect(() => {
    const unsub = sdk.settings.onChange('workspace.theme', (value) => {
      console.log('Theme changed to:', value);
    });
    return unsub;
  }, [sdk]);

  return null;
}
```

### Settings vs Storage -- when to use which

| Use Case | Settings | Storage |
|----------|----------|---------|
| Theme preference | Yes | No |
| Font size | Yes | No |
| Saved documents | No | Yes |
| User-created data | No | Yes |
| Toggle flags | Yes | No |
| Cache/temp data | No | Yes |
| Cross-app config | Yes | No |
| App-private data | No | Yes |

**Rule of thumb:** If it belongs in a settings UI panel, use Settings. If it is user-generated content, use Storage.

---

## 10. Collaboration Features

### Check collaboration status

```tsx
import { useCollaboration } from '@archbase/workspace-sdk';

function CollaborationStatus() {
  const { isConnected, roomId, currentUser, users } = useCollaboration();

  if (!isConnected) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
        Not connected
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12 }}>
      <p>Room: {roomId}</p>
      <p>You: {currentUser?.displayName}</p>
      <p>Online: {users.length}</p>
    </div>
  );
}
```

### Display online users list

```tsx
import { useCollaboration } from '@archbase/workspace-sdk';

function OnlineUsers() {
  const { users } = useCollaboration();

  return (
    <div>
      <h4>Online ({users.length})</h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {users.map((presence) => (
          <li
            key={presence.user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
            }}
          >
            <span
              style={{
                width: 'var(--collab-dot-size)',
                height: 'var(--collab-dot-size)',
                borderRadius: '50%',
                background:
                  presence.status === 'active'
                    ? '#22c55e'
                    : presence.status === 'idle'
                      ? '#f59e0b'
                      : '#6b7280',
                display: 'inline-block',
              }}
            />
            <span style={{ color: presence.user.color }}>
              {presence.user.displayName}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              {presence.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Show remote cursors

```tsx
import { useCollaboration } from '@archbase/workspace-sdk';

function CursorDisplay() {
  const { cursors } = useCollaboration();

  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.user.id}
          style={{
            position: 'absolute',
            left: cursor.cursor.x,
            top: cursor.cursor.y,
            pointerEvents: 'none',
            zIndex: 99999,
          }}
        >
          {/* Cursor arrow SVG */}
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M0 0L12 10L6 10L0 16Z" fill={cursor.user.color} />
          </svg>
          <span
            style={{
              background: cursor.user.color,
              color: '#fff',
              fontSize: 10,
              padding: '1px 4px',
              borderRadius: 3,
              marginLeft: 4,
              whiteSpace: 'nowrap',
            }}
          >
            {cursor.user.displayName}
          </span>
        </div>
      ))}
    </>
  );
}
```

### Display shared windows

```tsx
import { useCollaboration } from '@archbase/workspace-sdk';

function SharedWindowsList() {
  const { sharedWindows, isConnected } = useCollaboration();

  if (!isConnected || sharedWindows.length === 0) return null;

  return (
    <div>
      <h4>Shared Windows</h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {sharedWindows.map((win) => (
          <li key={win.windowId} style={{ padding: '4px 0' }}>
            <span>{win.windowId}</span>
            <span style={{ color: 'var(--text-secondary)', marginLeft: 8, fontSize: 11 }}>
              shared by {win.sharedBy}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Follow a user

```tsx
import { useCollaboration, useWorkspace } from '@archbase/workspace-sdk';

function FollowControl() {
  const sdk = useWorkspace();
  const { users, followingUserId } = useCollaboration();

  const followUser = (userId: string) => {
    sdk.collaboration.followUser(userId);
    sdk.notifications.info('Following', `Now following ${userId}`);
  };

  const unfollowUser = () => {
    sdk.collaboration.unfollowUser();
    sdk.notifications.info('Unfollowed', 'No longer following anyone.');
  };

  return (
    <div>
      {followingUserId ? (
        <div>
          <p>Following: {followingUserId}</p>
          <button onClick={unfollowUser}>Stop Following</button>
        </div>
      ) : (
        <div>
          <p>Click a user to follow:</p>
          {users.map((presence) => (
            <button
              key={presence.user.id}
              onClick={() => followUser(presence.user.id)}
              style={{ display: 'block', marginBottom: 4 }}
            >
              Follow {presence.user.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Quick Reference: Import Cheat Sheet

```tsx
// Hooks
import {
  useWorkspace,
  useWindowContext,
  useStorage,
  useAsyncStorage,
  useCommand,
  useSettingValue,
  useTheme,
  useCollaboration,
} from '@archbase/workspace-sdk';

// Core functions
import {
  createWorkspaceSDK,
  createSecureSDK,
  WorkspaceProvider,
} from '@archbase/workspace-sdk';

// Bridge (for iframe apps)
import {
  createHostBridge,
  createIframeBridgeSDK,
  isBridgeMessage,
  BRIDGE_MARKER,
} from '@archbase/workspace-sdk';

// Async storage service
import {
  createAsyncStorageService,
  IndexedDBProvider,
} from '@archbase/workspace-sdk';

// Storage providers
import {
  registerStorageProvider,
  setDefaultProvider,
  getStorageProvider,
  listStorageProviders,
  LocalStorageProvider,
} from '@archbase/workspace-sdk';

// Collaboration service
import {
  createCollaborationService,
} from '@archbase/workspace-sdk';

// Types
import type {
  WorkspaceSDK,
  WorkspaceProviderProps,
  HostBridgeOptions,
  IframeBridgeSDK,
  IframeBridgeOptions,
  StorageProvider,
  BridgeRequest,
  BridgeResponse,
  BridgeError,
  BridgeEvent,
  BridgeMessage,
} from '@archbase/workspace-sdk';
```

---

## See Also

- [Tutorial: First Plugin](./ARCHBASE-WORKSPACE-TUTORIAL-FIRST-PLUGIN.md) -- Build a plugin end-to-end.
- [Tutorial: Using the SDK](./ARCHBASE-WORKSPACE-TUTORIAL-SDK.md) -- Deep dive into all hooks and services.
- [Tutorial: Theming & Customization](./ARCHBASE-WORKSPACE-TUTORIAL-THEMING.md) -- CSS variable system guide.
- [SDK API Reference](./ARCHBASE-WORKSPACE-SDK-API.md) -- Complete method signatures and types.
- [Getting Started](./ARCHBASE-WORKSPACE-GETTING-STARTED.md) -- Create your first workspace app.
