# Tutorial: Building Your First Plugin

> **Difficulty:** Beginner
> **Time:** ~30 minutes
> **Prerequisites:** Node.js >= 20, pnpm >= 10, basic React + TypeScript knowledge
> **Last updated:** 2026-02-16

---

## Table of Contents

1. [What You Will Build](#1-what-you-will-build)
2. [Scaffolding with the CLI](#2-scaffolding-with-the-cli)
3. [Project Structure](#3-project-structure)
4. [Building the App Component](#4-building-the-app-component)
5. [Configuring Module Federation](#5-configuring-module-federation)
6. [Testing Locally](#6-testing-locally)
7. [Registering in the Workspace](#7-registering-in-the-workspace)
8. [Installing via the Marketplace](#8-installing-via-the-marketplace)

---

## 1. What You Will Build

In this tutorial you will build a **Task Tracker** plugin for Archbase Workspace. The finished app will:

- Display a list of tasks with add/remove functionality.
- Persist tasks across sessions using the SDK storage service.
- Register commands accessible from the Command Palette.
- Show toast notifications when tasks are completed.
- Respond to the workspace theme (dark/light).

By the end you will understand the full lifecycle of a plugin: scaffolding, development, registration, and distribution.

---

## 2. Scaffolding with the CLI

The quickest way to start a new plugin is the `@archbase/workspace-cli` scaffolding tool:

```bash
npx @archbase/workspace-cli create-app task-tracker
```

The CLI will ask a few questions:

```
? App display name: Task Tracker
? Description: A simple task tracking plugin
? Port number: 3010
? Permissions needed: notifications, storage
? Include example commands? Yes
```

Once the scaffolding completes you will see:

```
Created task-tracker in apps/task-tracker
Next steps:
  cd apps/task-tracker
  pnpm install
  pnpm dev
```

> **No CLI?** You can also create the project manually. Follow the [Getting Started Guide](./ARCHBASE-WORKSPACE-GETTING-STARTED.md) for a step-by-step manual setup.

---

## 3. Project Structure

The generated project has the following layout:

```
apps/task-tracker/
├── package.json          # Dependencies and scripts
├── rspack.config.ts      # Rspack + Module Federation configuration
├── tsconfig.json         # TypeScript configuration (extends base)
└── src/
    ├── index.ts          # Rspack entry point (bootstrap)
    └── App.tsx           # Root component exposed via Module Federation
```

### 3.1 -- package.json

The `package.json` declares the app name, scripts, and dependencies:

```json
{
  "name": "@archbase/task-tracker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "rspack serve",
    "build": "rspack build",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@archbase/workspace-sdk": "workspace:*"
  },
  "devDependencies": {
    "@rspack/core": "^1.2.0",
    "@rspack/cli": "^1.2.0",
    "@module-federation/enhanced": "^0.8.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

### 3.2 -- tsconfig.json

Extends the workspace base configuration:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": true
  },
  "include": ["src"]
}
```

### 3.3 -- rspack.config.ts

The Rspack configuration includes Module Federation setup:

```typescript
import { defineConfig } from '@rspack/cli';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import path from 'path';

export default defineConfig({
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    uniqueName: 'task_tracker',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic' } },
            },
          },
        },
        exclude: /node_modules/,
      },
      { test: /\.css$/, type: 'css' },
    ],
  },
  experiments: { css: true },
  plugins: [
    new ModuleFederationPlugin({
      name: 'task_tracker',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        zustand: { singleton: true, requiredVersion: '^5.0.0' },
        '@archbase/workspace-sdk': { singleton: true },
        '@archbase/workspace-state': { singleton: true },
      },
    }),
  ],
  devServer: {
    port: 3010,
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
});
```

Key conventions:
- `name` must be a valid JavaScript identifier -- use underscores, not hyphens.
- `exposes` maps `./App` to your root component.
- `shared` ensures React and Zustand are singletons across host and remotes.
- CORS headers are required for cross-origin module loading in development.

### 3.4 -- src/index.ts

The entry point can be minimal. Module Federation loads the component via `exposes`, not this file:

```typescript
// Entry point for standalone development
```

---

## 4. Building the App Component

Replace the contents of `src/App.tsx` with the Task Tracker implementation:

```tsx
// apps/task-tracker/src/App.tsx
import { useState } from 'react';
import {
  useWorkspace,
  useWindowContext,
  useCommand,
  useStorage,
  useSettingValue,
  useTheme,
} from '@archbase/workspace-sdk';

interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

function TaskTracker() {
  const sdk = useWorkspace();
  const { isFocused, setTitle } = useWindowContext();
  const { resolvedTheme } = useTheme();

  // Persistent storage -- tasks survive page reloads
  const [tasks, setTasks] = useStorage<Task[]>('tasks', []);

  // Read a setting declared in the manifest
  const [showCompleted] = useSettingValue<boolean>('task-tracker.showCompleted');

  // Local draft state (not persisted)
  const [draft, setDraft] = useState('');

  // --- Helpers ---

  const addTask = () => {
    if (!draft.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: draft.trim(),
      done: false,
      createdAt: Date.now(),
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    setDraft('');
    setTitle(`Task Tracker (${updated.filter((t) => !t.done).length})`);
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t,
    );
    setTasks(updated);

    const task = updated.find((t) => t.id === id);
    if (task?.done) {
      sdk.notifications.success('Task completed', task.text);
    }

    setTitle(`Task Tracker (${updated.filter((t) => !t.done).length})`);
  };

  const removeTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    setTitle(`Task Tracker (${updated.filter((t) => !t.done).length})`);
  };

  const clearCompleted = () => {
    const updated = tasks.filter((t) => !t.done);
    setTasks(updated);
    sdk.notifications.info('Cleared', 'Completed tasks removed.');
  };

  // --- Commands (accessible from Command Palette) ---

  useCommand('task-tracker.add', () => {
    // Focus the input -- in a real app you would use a ref
    sdk.notifications.info('Task Tracker', 'Type your task and press Enter.');
  });

  useCommand('task-tracker.clearCompleted', () => {
    clearCompleted();
  });

  // --- Filtering ---

  const visibleTasks = showCompleted === false
    ? tasks.filter((t) => !t.done)
    : tasks;

  const pendingCount = tasks.filter((t) => !t.done).length;

  // --- Context menu ---

  const handleContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    sdk.contextMenu.show({ x: e.clientX, y: e.clientY }, [
      {
        id: 'toggle',
        label: task.done ? 'Mark as pending' : 'Mark as done',
        action: () => toggleTask(task.id),
      },
      {
        id: 'remove',
        label: 'Remove',
        icon: 'trash',
        action: () => removeTask(task.id),
      },
    ]);
  };

  // --- Render ---

  return (
    <div
      style={{
        padding: 16,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: isFocused ? 1 : 0.85,
        color: resolvedTheme === 'dark' ? '#e2e8f0' : '#1f2937',
      }}
    >
      {/* Input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="What needs to be done?"
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--window-border-color)',
            background: 'var(--window-body-bg)',
            color: 'inherit',
            fontSize: 14,
          }}
        />
        <button
          onClick={addTask}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Add
        </button>
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {visibleTasks.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 20 }}>
            No tasks yet. Add one above!
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {visibleTasks.map((task) => (
              <li
                key={task.id}
                onContextMenu={(e) => handleContextMenu(e, task)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 4px',
                  borderBottom: '1px solid var(--window-border-color)',
                  cursor: 'pointer',
                }}
                onClick={() => toggleTask(task.id)}
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span
                  style={{
                    flex: 1,
                    textDecoration: task.done ? 'line-through' : 'none',
                    opacity: task.done ? 0.5 : 1,
                  }}
                >
                  {task.text}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTask(task.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                  aria-label={`Remove ${task.text}`}
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}
      >
        <span>{pendingCount} task{pendingCount !== 1 ? 's' : ''} remaining</span>
        {tasks.some((t) => t.done) && (
          <button
            onClick={clearCompleted}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--btn-primary-bg)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Clear completed
          </button>
        )}
      </div>
    </div>
  );
}

// Default export -- this is the entrypoint loaded by Module Federation
export default function App() {
  return <TaskTracker />;
}
```

### What This Code Does

1. **`useStorage`** persists the task list in scoped `localStorage` under the `task-tracker:tasks` key.
2. **`useCommand`** registers two commands (`task-tracker.add` and `task-tracker.clearCompleted`) that appear in the Command Palette.
3. **`useWindowContext`** provides `setTitle()` to update the window title dynamically with the pending count.
4. **`useSettingValue`** reads the `task-tracker.showCompleted` setting (declared in the manifest).
5. **`useTheme`** reads the current theme so the app can adapt styles outside the CSS variable system.
6. **`sdk.notifications`** shows toast messages when tasks are completed or cleared.
7. **`sdk.contextMenu`** shows a right-click menu on each task.

---

## 5. Configuring Module Federation

The Module Federation manifest is auto-generated by the `ModuleFederationPlugin` at build time. The host shell discovers it via the `remoteEntry` URL in the app manifest.

Key rules:

| Property | Value | Notes |
|----------|-------|-------|
| `name` | `task_tracker` | Must be a valid JS identifier (underscores, not hyphens) |
| `exposes['./App']` | `'./src/App.tsx'` | Path to the default-exported component |
| `shared.react` | `{ singleton: true }` | React must be a singleton |

The generated `mf-manifest.json` is served at `http://localhost:3010/mf-manifest.json` in development.

---

## 6. Testing Locally

### 6.1 -- Start the dev server

```bash
# From the workspace root
pnpm install
pnpm dev
```

This starts **all** dev servers via Turborepo, including:
- Host shell on port 3000
- Your task-tracker on port 3010

Alternatively, start only your app for isolated development:

```bash
cd apps/task-tracker
pnpm dev
```

### 6.2 -- Verify Module Federation output

Open `http://localhost:3010/mf-manifest.json` in your browser. You should see a JSON manifest containing your exposed modules.

### 6.3 -- Open in the Workspace

1. Navigate to `http://localhost:3000`.
2. Press `Cmd+K` (or `Ctrl+K`) to open the App Launcher.
3. Search for "Task Tracker" and select it.
4. A new window opens with your task tracker app.

### 6.4 -- Test features

- Add a few tasks and reload the page. Tasks should persist.
- Press `Cmd+Shift+P` to open the Command Palette and run "Task Tracker: Clear Completed".
- Right-click on a task to see the context menu.
- Complete a task and verify the notification appears.

---

## 7. Registering in the Workspace

For the host shell to discover your app, you need to register its manifest.

### 7.1 -- Add the manifest

Open `packages/core/src/knownManifests.ts` and add a URL constant and manifest entry:

```typescript
const MF_TASK_TRACKER_URL = process.env.MF_TASK_TRACKER_URL || 'http://localhost:3010';

// Add to the KNOWN_MANIFESTS array:
{
  id: 'dev.archbase.task-tracker',
  name: 'task_tracker',                      // Must match MF plugin name
  version: '0.1.0',
  entrypoint: './src/App.tsx',
  remoteEntry: `${MF_TASK_TRACKER_URL}/mf-manifest.json`,
  displayName: 'Task Tracker',
  description: 'A simple task tracking plugin',
  icon: '✅',
  window: {
    defaultWidth: 450,
    defaultHeight: 500,
    minWidth: 300,
    minHeight: 300,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true,
  },
  source: 'local',
  permissions: ['notifications', 'storage'],
  activationEvents: ['onCommand:task-tracker.add'],
  contributes: {
    commands: [
      {
        id: 'task-tracker.add',
        title: 'Add Task',
        category: 'Task Tracker',
        icon: '➕',
      },
      {
        id: 'task-tracker.clearCompleted',
        title: 'Clear Completed Tasks',
        category: 'Task Tracker',
        icon: '🧹',
      },
    ],
    settings: [
      {
        key: 'task-tracker.showCompleted',
        type: 'boolean',
        default: true,
        description: 'Show completed tasks in the list',
      },
    ],
  },
}
```

### 7.2 -- Register the MF remote

Open `packages/core/rspack.config.ts` and add the remote:

```typescript
// At the top:
const MF_TASK_TRACKER_URL = process.env.MF_TASK_TRACKER_URL || 'http://localhost:3010';

// In the ModuleFederationPlugin remotes:
task_tracker: `task_tracker@${MF_TASK_TRACKER_URL}/mf-manifest.json`,
```

### 7.3 -- Restart and verify

```bash
pnpm dev
```

Your app will now appear automatically in the App Launcher and Command Palette.

---

## 8. Installing via the Marketplace

Once your plugin is ready for distribution, it can be published to the Archbase Marketplace.

### 8.1 -- Prepare the manifest for publishing

Add marketplace metadata to your manifest:

```typescript
{
  // ...existing manifest fields...
  keywords: ['tasks', 'todo', 'productivity'],
  author: {
    name: 'Your Name',
    email: 'you@example.com',
  },
  repository: 'https://github.com/your-org/task-tracker',
  license: 'MIT',
}
```

### 8.2 -- Build the production bundle

```bash
cd apps/task-tracker
pnpm build
```

The output in `dist/` includes:
- `mf-manifest.json` -- Module Federation manifest
- `remoteEntry.js` -- The federated module entry
- Static assets

### 8.3 -- Deploy to a CDN or server

Upload the `dist/` folder to any static hosting:

```bash
# Example: deploy to Vercel
npx vercel deploy dist/
```

The manifest URL (e.g., `https://task-tracker.vercel.app/mf-manifest.json`) is what users will use to install your plugin.

### 8.4 -- User-side installation

End users install plugins through the Marketplace app:

1. Open the Marketplace from the App Launcher (`Cmd+K` > "Marketplace").
2. Search for "Task Tracker" or browse the Productivity category.
3. Click **Install** on the plugin card.
4. The manifest is added to the workspace registry.
5. The app appears in the App Launcher immediately.

Alternatively, users can install via the Command Palette:

1. Press `Cmd+Shift+P` to open the Command Palette.
2. Run "Marketplace: Install from URL".
3. Paste the manifest URL.

---

## Summary

You have now built a complete Archbase Workspace plugin that:

- Uses Module Federation for dynamic loading.
- Persists data with the SDK storage service.
- Registers commands for the Command Palette.
- Shows notifications and context menus.
- Adapts to the workspace theme.
- Can be distributed through the Marketplace.

## Next Steps

- [Tutorial: Using the SDK](./ARCHBASE-WORKSPACE-TUTORIAL-SDK.md) -- Deep dive into all SDK hooks and services.
- [Tutorial: Theming & Customization](./ARCHBASE-WORKSPACE-TUTORIAL-THEMING.md) -- Learn the CSS variable system.
- [Cookbook](./ARCHBASE-WORKSPACE-COOKBOOK.md) -- Quick recipes for common patterns.
- [SDK API Reference](./ARCHBASE-WORKSPACE-SDK-API.md) -- Complete API documentation.
